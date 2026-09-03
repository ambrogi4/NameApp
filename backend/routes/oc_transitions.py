from datetime import date, datetime
from flask import Blueprint, request, jsonify

from extensions import db
from models import Contact, Activity, OcTransition

oc_transitions_bp = Blueprint('oc_transitions', __name__)

VALID_OUTREACH_CATEGORIES = {'cold', 'nurture', 'partner', 'existing', 'internal', 'admin'}


@oc_transitions_bp.route('', methods=['GET'])
def get_transitions():
    """Get OC transitions, optionally filtered by contact_id."""
    contact_id = request.args.get('contact_id', type=int)
    query = OcTransition.query
    if contact_id is not None:
        query = query.filter_by(contact_id=contact_id)
    return jsonify([t.to_dict() for t in query.all()])


@oc_transitions_bp.route('', methods=['POST'])
def create_transition():
    """
    Create an OC transition record and update the contact's outreach_category.

    Request body:
    {
        "contact_id": 123,
        "from_oc": "cold",
        "to_oc": "nurture",
        "transition_date": "2026-09-02",  // optional, defaults to today
        "comment": "Had great call..."     // optional
    }

    Automatically captures:
    - last_activity_id: most recent activity for this contact
    - Updates contact.outreach_category to to_oc
    """
    data = request.get_json()

    contact_id = data.get('contact_id')
    if not contact_id:
        return jsonify({'error': 'contact_id is required'}), 400

    contact = Contact.query.get_or_404(contact_id)

    from_oc = data.get('from_oc')
    to_oc = data.get('to_oc')

    if not from_oc or from_oc not in VALID_OUTREACH_CATEGORIES:
        return jsonify({'error': f'from_oc must be one of {sorted(VALID_OUTREACH_CATEGORIES)}'}), 400

    if not to_oc or to_oc not in VALID_OUTREACH_CATEGORIES:
        return jsonify({'error': f'to_oc must be one of {sorted(VALID_OUTREACH_CATEGORIES)}'}), 400

    # Parse transition date
    transition_date_str = data.get('transition_date')
    if transition_date_str:
        transition_date = date.fromisoformat(transition_date_str)
    else:
        transition_date = date.today()

    # Find most recent activity for this contact
    last_activity = Activity.query.filter_by(contact_id=contact_id).order_by(
        Activity.activity_date.desc(),
        Activity.created_at.desc()
    ).first()

    transition = OcTransition(
        contact_id=contact_id,
        from_oc=from_oc,
        to_oc=to_oc,
        transition_date=transition_date,
        comment=data.get('comment'),
        last_activity_id=last_activity.id if last_activity else None,
        created_at=datetime.now(),
    )

    # Update the contact's outreach_category
    contact.outreach_category = to_oc

    db.session.add(transition)
    db.session.commit()

    return jsonify(transition.to_dict()), 201


@oc_transitions_bp.route('/<int:transition_id>', methods=['GET'])
def get_transition(transition_id):
    """Get a single OC transition by ID."""
    transition = OcTransition.query.get_or_404(transition_id)
    return jsonify(transition.to_dict())
