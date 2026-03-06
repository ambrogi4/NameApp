import os
import io
import re
import json
from datetime import date
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate
import time
import requests as http_requests
from bs4 import BeautifulSoup
from pypdf import PdfReader
import anthropic

static_dir = os.path.join(os.path.dirname(__file__), 'static')
app = Flask(__name__, static_folder=static_dir, static_url_path='')
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
migrate = Migrate(app, db)

VALID_CHANNELS = {'linkedin', 'email', 'phone', 'text', 'in_person', 'other'}
VALID_CONTENT_TYPES = {'pdf', 'youtube', 'article', 'podcast', 'webinar'}

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class Contact(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    created_date = db.Column(db.Date, default=date.today)
    first = db.Column(db.Text, nullable=False)
    last = db.Column(db.Text, nullable=False)
    title = db.Column(db.Text)
    firm = db.Column(db.Text)
    source = db.Column(db.Text)
    education = db.Column(db.Text)
    tags = db.Column(db.Text)
    comment = db.Column(db.Text)
    email = db.Column(db.Text)
    phone = db.Column(db.Text)
    street = db.Column(db.Text)
    city = db.Column(db.Text)
    state = db.Column(db.Text)
    zip = db.Column(db.Text)
    country = db.Column(db.Text)
    li_url = db.Column(db.Text)
    photo_url = db.Column(db.Text)
    in_crm = db.Column(db.Boolean, default=False)
    index_1 = db.Column(db.Integer)
    index_2 = db.Column(db.Integer)

    activities = db.relationship('Activity', backref='contact',
                                 cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'created_date': self.created_date.isoformat() if self.created_date else None,
            'first': self.first,
            'last': self.last,
            'title': self.title,
            'firm': self.firm,
            'source': self.source,
            'education': self.education,
            'tags': self.tags,
            'comment': self.comment,
            'email': self.email,
            'phone': self.phone,
            'street': self.street,
            'city': self.city,
            'state': self.state,
            'zip': self.zip,
            'country': self.country,
            'li_url': self.li_url,
            'photo_url': self.photo_url,
            'in_crm': self.in_crm,
            'index_1': self.index_1,
            'index_2': self.index_2,
        }


class Content(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.Text)
    short_name = db.Column(db.Text)
    title = db.Column(db.Text)
    author = db.Column(db.Text)
    created_date = db.Column(db.Date, default=date.today)
    publish_date = db.Column(db.Date)
    link = db.Column(db.Text)
    tags = db.Column(db.Text)
    comment = db.Column(db.Text)

    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'short_name': self.short_name,
            'title': self.title,
            'author': self.author,
            'created_date': self.created_date.isoformat() if self.created_date else None,
            'publish_date': self.publish_date.isoformat() if self.publish_date else None,
            'link': self.link,
            'tags': self.tags,
            'comment': self.comment,
        }


class Activity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    contact_id = db.Column(db.Integer, db.ForeignKey('contact.id'), nullable=False)
    content_id = db.Column(db.Integer, db.ForeignKey('content.id'), nullable=True)
    activity_date = db.Column(db.Date, default=date.today)
    channel = db.Column(db.Text)
    contact_responded = db.Column(db.Boolean, default=False)
    email_opened = db.Column(db.Boolean, default=False)
    topic = db.Column(db.Text)
    comment = db.Column(db.Text)
    in_crm = db.Column(db.Boolean, default=False)

    content = db.relationship('Content', backref='activities')

    def to_dict(self):
        return {
            'id': self.id,
            'contact_id': self.contact_id,
            'content_id': self.content_id,
            'activity_date': self.activity_date.isoformat() if self.activity_date else None,
            'channel': self.channel,
            'contact_responded': self.contact_responded,
            'email_opened': self.email_opened,
            'topic': self.topic,
            'comment': self.comment,
            'in_crm': self.in_crm,
        }


# ---------------------------------------------------------------------------
# Contact endpoints
# ---------------------------------------------------------------------------

@app.route('/api/contacts', methods=['GET'])
def get_contacts():
    contacts = Contact.query.all()
    return jsonify([c.to_dict() for c in contacts])


@app.route('/api/contacts', methods=['POST'])
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
    )
    db.session.add(contact)
    db.session.commit()
    return jsonify(contact.to_dict()), 201


@app.route('/api/contacts/batch', methods=['POST'])
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
            )
            db.session.add(contact)
            created.append(contact)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
    return jsonify([c.to_dict() for c in created]), 201


@app.route('/api/contacts/<int:contact_id>', methods=['PUT'])
def update_contact(contact_id):
    contact = Contact.query.get_or_404(contact_id)
    data = request.get_json()
    for field in ['first', 'last', 'title', 'firm', 'source', 'education',
                  'tags', 'comment', 'email', 'phone', 'street', 'city',
                  'state', 'zip', 'country', 'li_url', 'photo_url',
                  'in_crm', 'index_1', 'index_2']:
        if field in data:
            setattr(contact, field, data[field])
    db.session.commit()
    return jsonify(contact.to_dict())


@app.route('/api/contacts/<int:contact_id>', methods=['DELETE'])
def delete_contact(contact_id):
    contact = Contact.query.get_or_404(contact_id)
    db.session.delete(contact)
    db.session.commit()
    return jsonify({'message': 'Contact deleted'})


# ---------------------------------------------------------------------------
# Content endpoints
# ---------------------------------------------------------------------------

@app.route('/api/content', methods=['GET'])
def get_content():
    items = Content.query.all()
    return jsonify([c.to_dict() for c in items])


@app.route('/api/content', methods=['POST'])
def create_content():
    data = request.get_json()
    publish_date = None
    if data.get('publish_date'):
        publish_date = date.fromisoformat(data['publish_date'])
    content = Content(
        type=data.get('type'),
        short_name=data.get('short_name'),
        title=data.get('title'),
        author=data.get('author'),
        publish_date=publish_date,
        link=data.get('link'),
        tags=data.get('tags'),
        comment=data.get('comment'),
    )
    db.session.add(content)
    db.session.commit()
    return jsonify(content.to_dict()), 201


@app.route('/api/content/<int:content_id>', methods=['PUT'])
def update_content(content_id):
    content = Content.query.get_or_404(content_id)
    data = request.get_json()
    for field in ['type', 'short_name', 'title', 'author', 'link', 'tags', 'comment']:
        if field in data:
            setattr(content, field, data[field])
    if 'publish_date' in data:
        content.publish_date = date.fromisoformat(data['publish_date']) if data['publish_date'] else None
    db.session.commit()
    return jsonify(content.to_dict())


@app.route('/api/content/<int:content_id>', methods=['DELETE'])
def delete_content(content_id):
    content = Content.query.get_or_404(content_id)
    # Nullify references in activities instead of cascading
    Activity.query.filter_by(content_id=content_id).update({'content_id': None})
    db.session.delete(content)
    db.session.commit()
    return jsonify({'message': 'Content deleted'})


# ---------------------------------------------------------------------------
# Activity endpoints
# ---------------------------------------------------------------------------

@app.route('/api/activities', methods=['GET'])
def get_activities():
    contact_id = request.args.get('contact_id', type=int)
    query = Activity.query
    if contact_id is not None:
        query = query.filter_by(contact_id=contact_id)
    return jsonify([a.to_dict() for a in query.all()])


@app.route('/api/activities', methods=['POST'])
def create_activity():
    data = request.get_json()
    # Validate contact exists
    contact_id = data.get('contact_id')
    if not contact_id:
        return jsonify({'error': 'contact_id is required'}), 400
    Contact.query.get_or_404(contact_id)
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
    )
    db.session.add(activity)
    db.session.commit()
    return jsonify(activity.to_dict()), 201


@app.route('/api/activities/<int:activity_id>', methods=['PUT'])
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


@app.route('/api/activities/<int:activity_id>', methods=['DELETE'])
def delete_activity(activity_id):
    activity = Activity.query.get_or_404(activity_id)
    db.session.delete(activity)
    db.session.commit()
    return jsonify({'message': 'Activity deleted'})


# ---------------------------------------------------------------------------
# Content URL fetch + LLM extraction
# ---------------------------------------------------------------------------

def detect_url_type(url):
    if re.search(r'(youtube\.com/watch|youtu\.be/|youtube\.com/shorts/)', url):
        return 'youtube'
    try:
        head = http_requests.head(url, allow_redirects=True, timeout=10)
        ct = head.headers.get('Content-Type', '')
        if 'application/pdf' in ct:
            return 'pdf'
    except Exception:
        pass
    if url.lower().endswith('.pdf'):
        return 'pdf'
    return 'html'


def fetch_page_content(url, url_type):
    metadata = {}
    body_text = ''

    if url_type == 'youtube':
        # oEmbed for title/author
        oembed_url = f'https://www.youtube.com/oembed?url={url}&format=json'
        try:
            oembed = http_requests.get(oembed_url, timeout=10).json()
            metadata['title'] = oembed.get('title', '')
            metadata['author'] = oembed.get('author_name', '')
        except Exception:
            pass
        # Page HTML for description
        try:
            resp = http_requests.get(url, timeout=10)
            soup = BeautifulSoup(resp.text, 'html.parser')
            desc_tag = soup.find('meta', attrs={'name': 'description'})
            if desc_tag:
                body_text = desc_tag.get('content', '')
        except Exception:
            pass

    elif url_type == 'pdf':
        resp = http_requests.get(url, timeout=30)
        resp.raise_for_status()
        reader = PdfReader(io.BytesIO(resp.content))
        pages = []
        for i, page in enumerate(reader.pages[:5]):
            text = page.extract_text()
            if text:
                pages.append(text)
        body_text = '\n\n'.join(pages)
        # Try PDF metadata
        info = reader.metadata
        if info:
            metadata['title'] = info.get('/Title', '') or ''
            metadata['author'] = info.get('/Author', '') or ''

    else:  # html
        resp = http_requests.get(url, timeout=15,
                                  headers={'User-Agent': 'Mozilla/5.0 (compatible; NameApp/1.0)'})
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'html.parser')
        # Extract meta tags
        title_tag = soup.find('title')
        metadata['title'] = title_tag.get_text(strip=True) if title_tag else ''
        for name_attr in ['author', 'article:author']:
            tag = soup.find('meta', attrs={'name': name_attr}) or soup.find('meta', attrs={'property': name_attr})
            if tag and tag.get('content'):
                metadata['author'] = tag['content']
                break
        for name_attr in ['article:published_time', 'datePublished', 'publishedDate']:
            tag = soup.find('meta', attrs={'property': name_attr}) or soup.find('meta', attrs={'name': name_attr})
            if tag and tag.get('content'):
                metadata['publish_date'] = tag['content'][:10]
                break
        desc_tag = soup.find('meta', attrs={'name': 'description'}) or soup.find('meta', attrs={'property': 'og:description'})
        if desc_tag and desc_tag.get('content'):
            metadata['description'] = desc_tag['content']
        # Strip non-content elements, get body text
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
            tag.decompose()
        body_text = soup.get_text(separator='\n', strip=True)[:12000]

    return metadata, body_text


def call_claude(url, url_type, metadata, body_text):
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        raise ValueError('ANTHROPIC_API_KEY environment variable not set')

    client = anthropic.Anthropic(api_key=api_key)

    system_prompt = (
        'You extract structured metadata from web content. '
        'Return ONLY valid JSON with exactly these fields:\n'
        '- "type": one of "pdf", "youtube", "article", "podcast", "webinar"\n'
        '- "short_name": brief 2-4 word slug-style identifier\n'
        '- "title": full title\n'
        '- "author": creator name (empty string if unknown)\n'
        '- "publish_date": "YYYY-MM-DD" or null if unknown\n'
        '- "tags": comma-separated topic tags (3-5)\n'
        '- "comment": 1-2 sentence summary\n'
        'No markdown, no explanation, just the JSON object.'
    )

    user_msg = f'URL: {url}\nDetected type: {url_type}\n'
    if metadata:
        user_msg += f'Metadata: {json.dumps(metadata)}\n'
    if body_text:
        user_msg += f'Content:\n{body_text[:8000]}'

    response = client.messages.create(
        model='claude-haiku-4-5-20251001',
        max_tokens=500,
        system=system_prompt,
        messages=[{'role': 'user', 'content': user_msg}],
    )

    text = response.content[0].text.strip()
    # Strip markdown code fences if present
    if text.startswith('```'):
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
    return json.loads(text)


@app.route('/api/content/fetch-url', methods=['POST'])
def fetch_url_content():
    data = request.get_json()
    url = (data or {}).get('url', '').strip()
    if not url:
        return jsonify({'error': 'URL is required'}), 400

    try:
        url_type = detect_url_type(url)
    except Exception as e:
        return jsonify({'error': f'Could not reach URL: {e}'}), 502

    try:
        metadata, body_text = fetch_page_content(url, url_type)
    except Exception as e:
        return jsonify({'error': f'Failed to fetch content: {e}'}), 502

    try:
        result = call_claude(url, url_type, metadata, body_text)
    except ValueError as e:
        return jsonify({'error': str(e)}), 500
    except json.JSONDecodeError:
        return jsonify({'error': 'Failed to parse LLM response as JSON'}), 500
    except anthropic.APITimeoutError:
        return jsonify({'error': 'Claude API timed out'}), 504
    except anthropic.APIError as e:
        return jsonify({'error': f'Claude API error: {e}'}), 502

    # Ensure type is valid
    if result.get('type') not in VALID_CONTENT_TYPES:
        result['type'] = url_type if url_type in VALID_CONTENT_TYPES else 'article'

    result['link'] = url
    return jsonify(result)


# ---------------------------------------------------------------------------
# Config endpoint
# ---------------------------------------------------------------------------

@app.route('/api/config')
def get_config():
    return jsonify({
        'instanceName': os.environ.get('INSTANCE_NAME', 'myCRM'),
        'instanceColor': os.environ.get('INSTANCE_COLOR', '#87CEEB'),
    })


# ---------------------------------------------------------------------------
# Serve React frontend
# ---------------------------------------------------------------------------

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return app.send_static_file(path)
    return app.send_static_file('index.html')


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    retries = 5
    while retries > 0:
        try:
            with app.app_context():
                # Migration handles schema; just verify connectivity
                db.engine.connect()
            print("Database is ready.")
            break
        except Exception as e:
            print(f"Database not ready, retrying... ({e})")
            retries -= 1
            time.sleep(5)

    if retries == 0:
        print("Failed to connect to the database.")
    else:
        app.run(host='0.0.0.0', debug=True)
