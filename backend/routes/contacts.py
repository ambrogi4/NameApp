import json
import re
from flask import Blueprint, request, jsonify
import anthropic

from extensions import db
from models import Contact
from services.llm import get_claude_client, parse_json_response

contacts_bp = Blueprint('contacts', __name__)


@contacts_bp.route('', methods=['GET'])
def get_contacts():
    contacts = Contact.query.all()
    return jsonify([c.to_dict() for c in contacts])


@contacts_bp.route('', methods=['POST'])
def create_contact():
    data = request.get_json()
    contact = Contact(
        first=data['first'],
        last=data['last'],
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
        sf_owner_status=data.get('sf_owner_status'),
        index_1=data.get('index_1'),
        index_2=data.get('index_2'),
        outreach_category=data.get('outreach_category'),
    )
    db.session.add(contact)
    db.session.commit()
    return jsonify(contact.to_dict()), 201


@contacts_bp.route('/batch', methods=['POST'])
def create_contacts_batch():
    data_list = request.get_json()
    if not isinstance(data_list, list):
        return jsonify({'error': 'Expected a JSON array'}), 400
    created = []
    try:
        for data in data_list:
            contact = Contact(
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
                sf_owner_status=data.get('sf_owner_status'),
                index_1=data.get('index_1'),
                index_2=data.get('index_2'),
                outreach_category=data.get('outreach_category'),
            )
            db.session.add(contact)
            created.append(contact)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
    return jsonify([c.to_dict() for c in created]), 201


@contacts_bp.route('/<int:contact_id>', methods=['PUT'])
def update_contact(contact_id):
    contact = Contact.query.get_or_404(contact_id)
    data = request.get_json()
    for field in ['first', 'last', 'title', 'firm', 'source', 'education',
                  'tags', 'comment', 'email', 'phone', 'street', 'city',
                  'state', 'zip', 'country', 'li_url', 'photo_url',
                  'sf_owner_status', 'index_1', 'index_2', 'outreach_category']:
        if field in data:
            setattr(contact, field, data[field])
    db.session.commit()
    return jsonify(contact.to_dict())


@contacts_bp.route('/<int:contact_id>', methods=['DELETE'])
def delete_contact(contact_id):
    contact = Contact.query.get_or_404(contact_id)
    db.session.delete(contact)
    db.session.commit()
    return jsonify({'message': 'Contact deleted'})


@contacts_bp.route('/import-sf-owner-status', methods=['POST'])
def import_sf_owner_status():
    """
    Import Salesforce owner status updates from CSV data.
    Expects: [{ mycrm_id: int, sf_owner_status: str|null }, ...]
    Returns: { updated: int, unchanged: int, unknown: int }
    """
    from models import ContactStaging

    updates = request.get_json()
    if not isinstance(updates, list):
        return jsonify({'error': 'Expected a JSON array'}), 400

    updated = 0
    unchanged = 0
    unknown = 0

    for item in updates:
        mycrm_id = item.get('mycrm_id')
        sf_owner_status = item.get('sf_owner_status')

        # Try to find in Contact table first
        contact = Contact.query.get(mycrm_id)
        if contact:
            if contact.sf_owner_status == sf_owner_status:
                unchanged += 1
            else:
                contact.sf_owner_status = sf_owner_status
                updated += 1
            continue

        # Try ContactStaging table
        staged = ContactStaging.query.get(mycrm_id)
        if staged:
            if staged.sf_owner_status == sf_owner_status:
                unchanged += 1
            else:
                staged.sf_owner_status = sf_owner_status
                updated += 1
            continue

        # Not found in either table
        unknown += 1

    db.session.commit()

    return jsonify({
        'updated': updated,
        'unchanged': unchanged,
        'unknown': unknown
    })


@contacts_bp.route('/research-company', methods=['POST'])
def research_company():
    """
    Research company information using web search + Claude Haiku.
    Input: { firm: str, li_url: str (optional) }
    Returns: { companies: [...] } with 0-3 company matches
    """
    data = request.get_json()
    firm_name = (data or {}).get('firm', '').strip()
    li_url = (data or {}).get('li_url', '').strip()

    if not firm_name:
        return jsonify({'error': 'Firm name is required'}), 400

    try:
        from services.llm import call_claude
    except ImportError:
        return jsonify({'error': 'LLM service not available'}), 500

    # Build search queries
    queries = []

    # If LinkedIn URL available, try to anchor to LinkedIn company
    if li_url:
        queries.append(f'"{firm_name}" site:linkedin.com/company')

    # Standard company info search
    queries.append(f'"{firm_name}" headquarters employees CEO')

    # For investment firms, add AUM search
    if any(term in firm_name.lower() for term in ['capital', 'investment', 'fund', 'asset', 'wealth']):
        queries.append(f'"{firm_name}" AUM assets under management')

    # Use WebSearch (already available in Claude API)
    # Note: In production, would use actual web search API here
    # For now, construct prompt for Claude to simulate search results

    system_prompt = """You are researching companies based on their names.
Return ONLY a valid JSON array with company information.
For each company found, extract:
- Company name (full legal name)
- Headquarters location (city, state/country)
- Number of employees (approximate)
- CEO/Founder name
- Company type/industry
- AUM (if investment manager)
- Brief tagline or description

If multiple companies share similar names, list them separately.
Return ONLY a JSON array with this structure:
[
  {
    "name": "Company Name Inc.",
    "hq": "City, State",
    "employees": "50-100",
    "ceo": "John Smith",
    "type": "Investment Manager",
    "aum": "$500M",
    "tagline": "Brief description"
  }
]

Limit to 3 companies maximum. Return [] if no companies found."""

    user_content = f"Research the company: {firm_name}"

    try:
        # Get client and call API directly for more control over parsing
        client = get_claude_client()
        response = client.messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=2000,
            system=system_prompt,
            messages=[{'role': 'user', 'content': user_content}],
        )

        # Extract response text
        response_text = response.content[0].text.strip()

        # Remove markdown fences if present
        if response_text.startswith('```'):
            response_text = re.sub(r'^```(?:json)?\s*', '', response_text)
            response_text = re.sub(r'\s*```$', '', response_text)

        # Find the JSON array (everything from first [ to last ])
        json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
        if json_match:
            companies = json.loads(json_match.group(0))
            if isinstance(companies, list):
                companies = companies[:3]
            else:
                companies = []
        else:
            companies = []

        return jsonify({'companies': companies, 'firm': firm_name})

    except json.JSONDecodeError as e:
        return jsonify({'error': f'Failed to parse company data: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Research failed: {str(e)}'}), 500


@contacts_bp.route('/parse-linkedin', methods=['POST'])
def parse_linkedin_profile():
    data = request.get_json()
    text = (data or {}).get('text', '').strip()
    if not text:
        return jsonify({'error': 'Profile text is required'}), 400

    try:
        client = get_claude_client()
    except ValueError as e:
        return jsonify({'error': str(e)}), 500

    system_prompt = (
        'You extract structured contact info from LinkedIn profile text. '
        'Return ONLY valid JSON with exactly these fields:\n'
        '- "first": first name\n'
        '- "last": last name\n'
        '- "title": job title from the EXPERIENCE section (most recent role), '
        'NOT the banner/headline at the top of the profile which tends to be wordy\n'
        '- "firm": company name from the same Experience entry '
        '(empty string if unemployed, self-employed, or unclear)\n'
        '- "city": city from location info (empty string if unknown)\n'
        '- "state": US state abbreviation from location info (empty string if unknown or non-US)\n'
        '- "country": country from location info. Use "United States" for US contacts, '
        '"United Kingdom" for UK/England contacts, and the standard short country name for others '
        '(e.g., "Canada", "Germany", "France"). Empty string if unknown.\n'
        '- "education": university name only (undergraduate institution preferred), '
        'no degree or major details; if multiple schools, pick the undergrad; '
        'empty string if not listed\n'
        'No markdown, no explanation, just the JSON object.'
    )

    try:
        response = client.messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=300,
            system=system_prompt,
            messages=[{'role': 'user', 'content': f'LinkedIn profile text:\n{text[:12000]}'}],
        )
        result = parse_json_response(response.content[0].text)
    except json.JSONDecodeError:
        return jsonify({'error': 'Failed to parse LLM response as JSON'}), 500
    except anthropic.APITimeoutError:
        return jsonify({'error': 'Claude API timed out'}), 504
    except anthropic.APIError as e:
        return jsonify({'error': f'Claude API error: {e}'}), 502

    # Ensure all expected fields exist
    for field in ['first', 'last', 'title', 'firm', 'city', 'state', 'country', 'education']:
        if field not in result:
            result[field] = ''

    return jsonify(result)


@contacts_bp.route('/parse-conference', methods=['POST'])
def parse_conference_speakers():
    data = request.get_json()
    text = (data or {}).get('text', '').strip()
    if not text:
        return jsonify({'error': 'Conference text is required'}), 400

    try:
        client = get_claude_client()
    except ValueError as e:
        return jsonify({'error': str(e)}), 500

    system_prompt = (
        'You extract structured speaker information from conference web page text. '
        'The text is a raw copy-paste from a conference website listing speakers. '
        'Return ONLY a valid JSON array of objects, one per speaker, with these fields:\n'
        '- "first": first name\n'
        '- "last": last name\n'
        '- "title": job title (empty string if not listed)\n'
        '- "firm": company/organization (empty string if not listed)\n'
        'Ignore non-speaker content like navigation, footers, sponsor logos, session descriptions. '
        'If a person has multiple roles listed, use the most prominent/current one. '
        'No markdown, no explanation, just the JSON array.'
    )

    try:
        response = client.messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=4096,
            system=system_prompt,
            messages=[{'role': 'user', 'content': f'Conference page text:\n{text[:30000]}'}],
        )
        speakers = parse_json_response(response.content[0].text)
    except json.JSONDecodeError:
        return jsonify({'error': 'Failed to parse LLM response as JSON'}), 500
    except anthropic.APITimeoutError:
        return jsonify({'error': 'Claude API timed out'}), 504
    except anthropic.APIError as e:
        return jsonify({'error': f'Claude API error: {e}'}), 502

    # Ensure all expected fields exist in each speaker
    for speaker in speakers:
        for field in ['first', 'last', 'title', 'firm']:
            if field not in speaker:
                speaker[field] = ''

    return jsonify({'speakers': speakers})
