import io
import re
import json
from datetime import date
from flask import Blueprint, request, jsonify
import requests as http_requests
from bs4 import BeautifulSoup
from pypdf import PdfReader
import anthropic

from extensions import db
from models import Content, Activity
from services.llm import get_claude_client, parse_json_response, VALID_CONTENT_TYPES

content_bp = Blueprint('content', __name__)


def detect_url_type(url):
    """Detect if URL is youtube, pdf, or html."""
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
    """Fetch and extract content from URL based on type."""
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


def call_claude_for_content(url, url_type, metadata, body_text):
    """Call Claude to extract structured content metadata."""
    client = get_claude_client()

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

    return parse_json_response(response.content[0].text)


@content_bp.route('', methods=['GET'])
def get_content():
    items = Content.query.all()
    return jsonify([c.to_dict() for c in items])


@content_bp.route('', methods=['POST'])
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


@content_bp.route('/<int:content_id>', methods=['PUT'])
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


@content_bp.route('/<int:content_id>', methods=['DELETE'])
def delete_content(content_id):
    content = Content.query.get_or_404(content_id)
    # Nullify references in activities instead of cascading
    Activity.query.filter_by(content_id=content_id).update({'content_id': None})
    db.session.delete(content)
    db.session.commit()
    return jsonify({'message': 'Content deleted'})


@content_bp.route('/fetch-url', methods=['POST'])
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
        result = call_claude_for_content(url, url_type, metadata, body_text)
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
