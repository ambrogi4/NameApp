from datetime import date
from flask import Blueprint, request, jsonify

from extensions import db
from models import ContactStaging, Contact, Activity
from services.llm import call_claude

staging_bp = Blueprint('staging', __name__)

VALID_SOURCE_TYPES = {'linkedin_import', 'linkedin_import_cr', 'conference_import', 'manual', 'url_fetch', 'paste'}

# Mapping from source_type to Contact.source field
SOURCE_TYPE_TO_SOURCE = {
    'linkedin_import': 'LinkedIn',
    'linkedin_import_cr': 'LinkedInCR',
}
VALID_DUPE_STATUSES = {'pending', 'no_match', 'has_match', 'promoted', 'skipped'}
VALID_EMAIL_CONFIDENCE = {'none', 'guessed', 'verified'}
VALID_ENRICHMENT_STATUSES = {'new', 'pending', 'complete', 'enriched'}

CONTACT_FIELDS = [
    'first', 'last', 'title', 'firm', 'source', 'education',
    'tags', 'comment', 'email', 'phone', 'street', 'city',
    'state', 'zip', 'country', 'li_url', 'photo_url',
    'in_crm', 'index_1', 'index_2', 'outreach_category'
]

VALID_OUTREACH_CATEGORIES = {'cold', 'nurture', 'partner', 'existing', 'internal', 'admin'}

STAGING_FIELDS = [
    'source_type', 'dupe_status', 'matched_contact_id',
    'email_confidence', 'enrichment_status'
]


@staging_bp.route('', methods=['GET'])
def get_staged_contacts():
    """Get all staged contacts, optionally filtered by dupe_status."""
    status_filter = request.args.get('dupe_status')
    query = ContactStaging.query
    if status_filter:
        query = query.filter(ContactStaging.dupe_status == status_filter)
    staged = query.all()
    return jsonify([s.to_dict() for s in staged])


@staging_bp.route('', methods=['POST'])
def create_staged_contact():
    """Create a single staged contact with automatic dupe detection."""
    data = request.get_json()
    staged = _create_staged_from_data(data)
    db.session.add(staged)
    db.session.commit()
    return jsonify(staged.to_dict()), 201


@staging_bp.route('/batch', methods=['POST'])
def create_staged_contacts_batch():
    """Create multiple staged contacts with automatic dupe detection."""
    data_list = request.get_json()
    if not isinstance(data_list, list):
        return jsonify({'error': 'Expected a JSON array'}), 400

    created = []
    try:
        for data in data_list:
            staged = _create_staged_from_data(data)
            db.session.add(staged)
            created.append(staged)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

    return jsonify([s.to_dict() for s in created]), 201


@staging_bp.route('/<int:staging_id>', methods=['PUT'])
def update_staged_contact(staging_id):
    """Update a staged contact."""
    staged = ContactStaging.query.get_or_404(staging_id)
    data = request.get_json()

    for field in CONTACT_FIELDS + STAGING_FIELDS:
        if field in data:
            setattr(staged, field, data[field])

    db.session.commit()
    return jsonify(staged.to_dict())


@staging_bp.route('/<int:staging_id>', methods=['DELETE'])
def delete_staged_contact(staging_id):
    """Delete a staged contact (skip without promoting)."""
    staged = ContactStaging.query.get_or_404(staging_id)
    db.session.delete(staged)
    db.session.commit()
    return jsonify({'message': 'Staged contact deleted'})


@staging_bp.route('/<int:staging_id>/promote', methods=['POST'])
def promote_staged_contact(staging_id):
    """
    Promote a single staged contact to Contact table.

    Request body options:
    - {} or no body: Create new contact
    - {"merge": true}: Merge with matched_contact_id (if exists)
    - {"merge_fields": {"field": "value"}}: Custom merge fields to matched contact

    Automation:
    - source_type 'linkedin_import' sets Contact.source = 'LinkedIn'
    - source_type 'linkedin_import_cr' sets Contact.source = 'LinkedInCR'
      and creates an Activity (channel=linkedin, topic='sent connection request')
    """
    staged = ContactStaging.query.get_or_404(staging_id)

    # Validate outreach_category is set
    if not staged.outreach_category:
        return jsonify({'error': 'Outreach Category required before promotion'}), 400

    source_type = staged.source_type
    data = request.get_json() or {}
    created_activity = None

    if data.get('merge') and staged.matched_contact_id:
        # Merge into existing contact
        contact = Contact.query.get_or_404(staged.matched_contact_id)
        staged_dict = staged.to_contact_dict()

        # Gap-fill: only update empty fields on existing contact
        for field, value in staged_dict.items():
            if value and not getattr(contact, field):
                setattr(contact, field, value)

        # Apply any explicit merge_fields
        merge_fields = data.get('merge_fields', {})
        for field, value in merge_fields.items():
            if hasattr(contact, field):
                setattr(contact, field, value)

        # Apply source from source_type (for CR automation)
        _apply_source_from_source_type(contact, source_type)

        db.session.delete(staged)
        db.session.flush()  # Ensure contact has ID before creating activity

        # Create CR activity if applicable
        created_activity = _create_cr_activity_if_needed(contact)

        db.session.commit()
        result = contact.to_dict()
        if created_activity:
            result['_created_activity_id'] = created_activity.id
        return jsonify(result)
    else:
        # Create new contact
        contact = Contact(**staged.to_contact_dict())

        # Apply source from source_type
        _apply_source_from_source_type(contact, source_type)

        db.session.add(contact)
        db.session.delete(staged)
        db.session.flush()  # Ensure contact has ID before creating activity

        # Create CR activity if applicable
        created_activity = _create_cr_activity_if_needed(contact)

        db.session.commit()
        result = contact.to_dict()
        if created_activity:
            result['_created_activity_id'] = created_activity.id
        return jsonify(result), 201


@staging_bp.route('/promote-batch', methods=['POST'])
def promote_staged_contacts_batch():
    """
    Batch promote staged contacts.

    Request body:
    [
      {"id": 1, "action": "create"},
      {"id": 2, "action": "merge"},
      {"id": 3, "action": "skip"}
    ]

    Automation:
    - source_type 'linkedin_import' sets Contact.source = 'LinkedIn'
    - source_type 'linkedin_import_cr' sets Contact.source = 'LinkedInCR'
      and creates an Activity (channel=linkedin, topic='sent connection request')
    """
    actions = request.get_json()
    if not isinstance(actions, list):
        return jsonify({'error': 'Expected a JSON array'}), 400

    results = {'created': [], 'merged': [], 'skipped': [], 'errors': [], 'activities_created': 0}

    # Track contacts that need CR activity creation (after flush so IDs are available)
    contacts_for_cr_activity = []

    try:
        for action in actions:
            staging_id = action.get('id')
            action_type = action.get('action', 'create')

            staged = ContactStaging.query.get(staging_id)
            if not staged:
                results['errors'].append({'id': staging_id, 'error': 'Not found'})
                continue

            # Validate outreach_category for non-skip actions
            if action_type != 'skip' and not staged.outreach_category:
                results['errors'].append({
                    'id': staging_id,
                    'error': 'Outreach Category required before promotion'
                })
                continue

            source_type = staged.source_type  # Capture before deletion

            if action_type == 'skip':
                db.session.delete(staged)
                results['skipped'].append(staging_id)

            elif action_type == 'merge' and staged.matched_contact_id:
                contact = Contact.query.get(staged.matched_contact_id)
                if contact:
                    staged_dict = staged.to_contact_dict()
                    for field, value in staged_dict.items():
                        if value and not getattr(contact, field):
                            setattr(contact, field, value)
                    # Apply source from source_type
                    _apply_source_from_source_type(contact, source_type)
                    db.session.delete(staged)
                    results['merged'].append({'staging_id': staging_id, 'contact': contact.to_dict()})
                    # Queue for CR activity if applicable
                    if contact.source == 'LinkedInCR':
                        contacts_for_cr_activity.append(contact)
                else:
                    # Matched contact was deleted, create new instead
                    contact = Contact(**staged.to_contact_dict())
                    _apply_source_from_source_type(contact, source_type)
                    db.session.add(contact)
                    db.session.delete(staged)
                    results['created'].append(contact.to_dict())
                    if contact.source == 'LinkedInCR':
                        contacts_for_cr_activity.append(contact)

            else:  # 'create' or fallback
                contact = Contact(**staged.to_contact_dict())
                _apply_source_from_source_type(contact, source_type)
                db.session.add(contact)
                db.session.delete(staged)
                results['created'].append(contact.to_dict())
                if contact.source == 'LinkedInCR':
                    contacts_for_cr_activity.append(contact)

        # Flush to get contact IDs for new contacts
        db.session.flush()

        # Create CR activities for all applicable contacts
        for contact in contacts_for_cr_activity:
            activity = _create_cr_activity_if_needed(contact)
            if activity:
                results['activities_created'] += 1

        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

    return jsonify(results)


@staging_bp.route('/recheck-dupes', methods=['POST'])
def recheck_duplicates():
    """Re-run duplicate detection on all pending/no_match staged contacts."""
    staged_list = ContactStaging.query.filter(
        ContactStaging.dupe_status.in_(['pending', 'no_match'])
    ).all()
    contacts = Contact.query.all()

    updated = []
    for staged in staged_list:
        match = _find_duplicate(staged, contacts)
        if match:
            staged.dupe_status = 'has_match'
            staged.matched_contact_id = match['contact'].id
        else:
            staged.dupe_status = 'no_match'
            staged.matched_contact_id = None
        updated.append(staged.to_dict())

    db.session.commit()
    return jsonify(updated)


def _create_staged_from_data(data):
    """Create a ContactStaging instance with automatic dupe detection."""
    staged = ContactStaging(
        first=data.get('first', ''),
        last=data.get('last', ''),
        title=data.get('title'),
        firm=data.get('firm'),
        source=data.get('source'),
        education=data.get('education'),
        tags=data.get('tags'),
        comment=data.get('comment'),
        email=data.get('email'),
        phone=data.get('phone'),
        street=data.get('street'),
        city=data.get('city'),
        state=data.get('state'),
        zip=data.get('zip'),
        country=data.get('country'),
        li_url=data.get('li_url'),
        photo_url=data.get('photo_url'),
        in_crm=data.get('in_crm', False),
        index_1=data.get('index_1'),
        index_2=data.get('index_2'),
        outreach_category=data.get('outreach_category'),
        source_type=data.get('source_type'),
        email_confidence=data.get('email_confidence', 'none'),
        enrichment_status=data.get('enrichment_status', 'new'),
    )

    # Run dupe detection
    contacts = Contact.query.all()
    match = _find_duplicate(staged, contacts)
    if match:
        staged.dupe_status = 'has_match'
        staged.matched_contact_id = match['contact'].id
    else:
        staged.dupe_status = 'no_match'

    return staged


def _find_duplicate(staged, contacts):
    """Find duplicate contact for a staged contact."""
    # Priority 1: LinkedIn URL exact match
    li_url = (staged.li_url or '').strip().lower()
    if li_url:
        for c in contacts:
            existing_url = (c.li_url or '').strip().lower()
            if existing_url and existing_url == li_url:
                return {'contact': c, 'match_type': 'LinkedIn URL'}

    # Priority 2: First + Last name match
    first = (staged.first or '').strip().lower()
    last = (staged.last or '').strip().lower()
    if first and last:
        for c in contacts:
            ex_first = (c.first or '').strip().lower()
            ex_last = (c.last or '').strip().lower()
            if ex_first == first and ex_last == last:
                return {'contact': c, 'match_type': 'name match'}

    return None


def _guess_email(first, last, firm):
    """Use Claude to guess professional email from name + company."""
    system_prompt = '''You guess professional email addresses.
Given a person's name and company, return their likely work email.
Use your knowledge of company email domains and patterns.
Common patterns: first.last@, flast@, firstl@, firstname@
Return JSON: {"email": "...", "pattern": "..."}
If you cannot determine the domain, return {"email": null, "error": "..."}'''

    user_content = f"Name: {first} {last}\nCompany: {firm}"
    return call_claude(system_prompt, user_content, max_tokens=100)


def _apply_source_from_source_type(contact, source_type):
    """Set Contact.source based on source_type if not already set."""
    if contact.source:
        return  # Don't overwrite existing source
    mapped_source = SOURCE_TYPE_TO_SOURCE.get(source_type)
    if mapped_source:
        contact.source = mapped_source


def _create_cr_activity_if_needed(contact):
    """Create connection request activity if contact.source is LinkedInCR."""
    if contact.source != 'LinkedInCR':
        return None
    activity = Activity(
        contact_id=contact.id,
        content_id=None,
        activity_date=date.today(),
        channel='linkedin',
        topic='sent connection request',
        contact_responded=False,
        email_opened=False,
        in_crm=False,
        outreach_category=contact.outreach_category,  # Snapshot from contact
    )
    db.session.add(activity)
    return activity


@staging_bp.route('/bulk-oc', methods=['PUT'])
def set_bulk_outreach_category():
    """Set outreach_category for multiple staged contacts at once."""
    data = request.get_json()
    ids = data.get('ids', [])
    outreach_category = data.get('outreach_category')

    if not ids:
        return jsonify({'error': 'No IDs provided'}), 400

    if outreach_category and outreach_category not in VALID_OUTREACH_CATEGORIES:
        return jsonify({
            'error': f'outreach_category must be one of {sorted(VALID_OUTREACH_CATEGORIES)}'
        }), 400

    staged_list = ContactStaging.query.filter(ContactStaging.id.in_(ids)).all()
    updated = []

    for staged in staged_list:
        staged.outreach_category = outreach_category
        updated.append(staged.to_dict())

    db.session.commit()
    return jsonify({'updated': updated})


@staging_bp.route('/guess-emails', methods=['POST'])
def guess_staged_emails():
    """Guess email addresses for staged contacts using LLM.

    Status workflow:
    - new: record just arrived, eligible for guessing
    - pending: guess in progress
    - complete: guess attempted, no valid email found
    - enriched: guess successful, email populated
    """
    data = request.get_json()
    ids = data.get('ids', [])
    if not ids:
        return jsonify({'error': 'No IDs provided'}), 400

    staged_list = ContactStaging.query.filter(ContactStaging.id.in_(ids)).all()

    # Set all to 'pending' immediately
    for staged in staged_list:
        staged.enrichment_status = 'pending'
    db.session.commit()

    results = []

    for staged in staged_list:
        first = (staged.first or '').strip()
        last = (staged.last or '').strip()
        firm = (staged.firm or '').strip()

        if not first or not last:
            staged.enrichment_status = 'complete'
            results.append({
                'id': staged.id,
                'email': None,
                'error': 'Missing first or last name',
                'success': False
            })
            continue

        if not firm:
            staged.enrichment_status = 'complete'
            results.append({
                'id': staged.id,
                'email': None,
                'error': 'Missing firm',
                'success': False
            })
            continue

        try:
            result = _guess_email(first, last, firm)
            email = result.get('email')
            if email:
                staged.email = email
                staged.email_confidence = 'guessed'
                staged.enrichment_status = 'enriched'
                results.append({
                    'id': staged.id,
                    'email': email,
                    'email_confidence': 'guessed',
                    'success': True
                })
            else:
                staged.enrichment_status = 'complete'
                results.append({
                    'id': staged.id,
                    'email': None,
                    'error': result.get('error', 'Could not guess email'),
                    'success': False
                })
        except Exception as e:
            staged.enrichment_status = 'complete'
            results.append({
                'id': staged.id,
                'email': None,
                'error': str(e),
                'success': False
            })

    db.session.commit()
    return jsonify({'results': results})
