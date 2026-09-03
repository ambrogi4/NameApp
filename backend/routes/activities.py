from datetime import date
from flask import Blueprint, request, jsonify

from extensions import db
from models import Contact, Content, Activity
from services.llm import VALID_CHANNELS

activities_bp = Blueprint('activities', __name__)


@activities_bp.route('', methods=['GET'])
def get_activities():
    contact_id = request.args.get('contact_id', type=int)
    query = Activity.query
    if contact_id is not None:
        query = query.filter_by(contact_id=contact_id)
    return jsonify([a.to_dict() for a in query.all()])


@activities_bp.route('', methods=['POST'])
def create_activity():
    data = request.get_json()
    # Validate contact exists
    contact_id = data.get('contact_id')
    if not contact_id:
        return jsonify({'error': 'contact_id is required'}), 400
    contact = Contact.query.get_or_404(contact_id)
    # Validate content exists if provided
    content_id = data.get('content_id') or None
    if content_id:
        Content.query.get_or_404(content_id)
    # Validate channel
    channel = data.get('channel')
    if channel and channel not in VALID_CHANNELS:
        return jsonify({'error': f'channel must be one of {sorted(VALID_CHANNELS)}'}), 400
    activity_date = None
    if data.get('activity_date'):
        activity_date = date.fromisoformat(data['activity_date'])
    activity = Activity(
        contact_id=contact_id,
        content_id=content_id,
        activity_date=activity_date if activity_date else date.today(),
        channel=channel,
        contact_responded=data.get('contact_responded', False),
        email_opened=data.get('email_opened', False),
        topic=data.get('topic'),
        comment=data.get('comment'),
        in_crm=data.get('in_crm', False),
        outreach_category=contact.outreach_category,  # Snapshot from contact
    )
    db.session.add(activity)
    db.session.commit()
    return jsonify(activity.to_dict()), 201


@activities_bp.route('/<int:activity_id>', methods=['PUT'])
def update_activity(activity_id):
    activity = Activity.query.get_or_404(activity_id)
    data = request.get_json()
    # Validate FK references if changed
    if 'contact_id' in data:
        Contact.query.get_or_404(data['contact_id'])
    if 'content_id' in data and data['content_id']:
        Content.query.get_or_404(data['content_id'])
    if 'channel' in data and data['channel'] and data['channel'] not in VALID_CHANNELS:
        return jsonify({'error': f'channel must be one of {sorted(VALID_CHANNELS)}'}), 400
    for field in ['contact_id', 'content_id', 'channel', 'contact_responded',
                  'email_opened', 'topic', 'comment', 'in_crm']:
        if field in data:
            setattr(activity, field, data[field])
    if 'activity_date' in data:
        activity.activity_date = date.fromisoformat(data['activity_date']) if data['activity_date'] else None
    db.session.commit()
    return jsonify(activity.to_dict())


@activities_bp.route('/<int:activity_id>', methods=['DELETE'])
def delete_activity(activity_id):
    activity = Activity.query.get_or_404(activity_id)
    db.session.delete(activity)
    db.session.commit()
    return jsonify({'message': 'Activity deleted'})
