import json
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
        in_crm=data.get('in_crm', False),
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
                in_crm=data.get('in_crm', False),
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
                  'in_crm', 'index_1', 'index_2', 'outreach_category']:
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
    for field in ['first', 'last', 'title', 'firm', 'city', 'state', 'education']:
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
