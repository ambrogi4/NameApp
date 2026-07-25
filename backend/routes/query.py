import re
import json
from datetime import date, datetime
from flask import Blueprint, request, jsonify
from sqlalchemy import text
import anthropic

from extensions import db
from services.llm import get_claude_client, parse_json_response

query_bp = Blueprint('query', __name__)

# SQL safety: forbidden keywords that indicate non-SELECT queries
FORBIDDEN_SQL_KEYWORDS = {
    'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE',
    'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'MERGE', 'UPSERT'
}


def validate_sql_safety(sql):
    """Validate that SQL is a safe read-only SELECT query."""
    sql_upper = sql.upper().strip()
    # Must start with SELECT or WITH (for CTEs)
    if not (sql_upper.startswith('SELECT') or sql_upper.startswith('WITH')):
        raise ValueError('Only SELECT queries are allowed')
    # Check for forbidden keywords
    for keyword in FORBIDDEN_SQL_KEYWORDS:
        # Match whole word only using word boundaries
        if re.search(r'\b' + keyword + r'\b', sql_upper):
            raise ValueError(f'Forbidden SQL keyword: {keyword}')
    # Block statement terminators that could allow injection
    if ';' in sql and not sql.strip().endswith(';'):
        raise ValueError('Multiple SQL statements not allowed')
    return True


NL_QUERY_SYSTEM_PROMPT = '''You are a CRM query interpreter. Given a natural language question about contacts, activities, and content, generate a safe SQL SELECT query.

DATABASE SCHEMA:
- contact(id, first, last, title, firm, source, education, tags, comment, email, phone, street, city, state, zip, country, li_url, photo_url, in_crm, index_1, index_2, created_date)
- content(id, type, short_name, title, author, created_date, publish_date, link, tags, comment)
  - type values: 'pdf', 'youtube', 'article', 'podcast', 'webinar'
- activity(id, contact_id, content_id, activity_date, channel, contact_responded, email_opened, topic, comment, in_crm, created_at)
  - contact_id references contact(id)
  - content_id references content(id) [nullable]
  - channel values: 'linkedin', 'email', 'phone', 'text', 'in_person', 'other'

QUERY RULES:
1. ONLY generate SELECT queries - never INSERT, UPDATE, DELETE, DROP, or any DDL
2. Use LOWER() and LIKE for fuzzy text matching (e.g., LOWER(firm) LIKE '%merrill%')
3. For "sent" or "shared" content, join activity with content via content_id
4. For "haven't sent" patterns, use NOT IN or NOT EXISTS with subqueries
5. Date comparisons: use activity_date for when things happened
6. For "last N days/months", calculate relative to CURRENT_DATE
7. Always return the full row from the primary table being queried

RESPONSE FORMAT:
Return ONLY valid JSON with these fields:
- "sql": the SELECT query
- "resultTable": "contacts" | "activities" | "content" (which table's rows are returned)
- "interpretation": plain English description of what this query finds (1 sentence)
- "confidence": "high" | "medium" | "low"

No markdown, no explanation, just the JSON object.'''


@query_bp.route('/query', methods=['POST'])
def natural_language_query():
    """Execute a natural language query against the CRM database."""
    data = request.get_json()
    query_text = (data or {}).get('query', '').strip()
    if not query_text:
        return jsonify({'error': 'Query text is required'}), 400

    try:
        client = get_claude_client()
    except ValueError as e:
        return jsonify({'error': str(e)}), 500

    try:
        response = client.messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=1000,
            system=NL_QUERY_SYSTEM_PROMPT,
            messages=[{'role': 'user', 'content': f'Question: {query_text}'}],
        )
        parsed = parse_json_response(response.content[0].text)
    except json.JSONDecodeError:
        return jsonify({'error': 'Failed to parse query interpretation'}), 500
    except anthropic.APITimeoutError:
        return jsonify({'error': 'Query service timed out'}), 504
    except anthropic.APIError as e:
        return jsonify({'error': f'Query service error: {e}'}), 502

    sql = parsed.get('sql', '')
    result_table = parsed.get('resultTable', 'contacts')
    interpretation = parsed.get('interpretation', '')
    confidence = parsed.get('confidence', 'medium')

    # Validate SQL safety
    try:
        validate_sql_safety(sql)
    except ValueError as e:
        return jsonify({'error': f'Unsafe query rejected: {e}'}), 400

    # Execute the query
    try:
        result = db.session.execute(text(sql))
        rows = result.fetchall()
        columns = result.keys()
        # Convert to list of dicts
        results = [dict(zip(columns, row)) for row in rows]
        # Convert date/datetime objects to ISO strings
        for row in results:
            for key, val in row.items():
                if isinstance(val, (date, datetime)):
                    row[key] = val.isoformat()
    except Exception as e:
        return jsonify({'error': f'Query execution failed: {e}'}), 500

    return jsonify({
        'results': results,
        'resultTable': result_table,
        'interpretation': interpretation,
        'confidence': confidence,
        'sql': sql,
        'count': len(results),
    })
