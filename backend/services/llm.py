import os
import re
import json
import anthropic

# Valid enum values shared across routes
VALID_CHANNELS = {'linkedin', 'email', 'phone', 'text', 'in_person', 'other'}
VALID_CONTENT_TYPES = {'pdf', 'youtube', 'article', 'podcast', 'webinar'}


def get_claude_client():
    """Get an Anthropic client instance."""
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        raise ValueError('ANTHROPIC_API_KEY environment variable not set')
    return anthropic.Anthropic(api_key=api_key)


def parse_json_response(text):
    """Parse JSON from Claude response, stripping markdown fences if present."""
    text = text.strip()
    if text.startswith('```'):
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
    return json.loads(text)


def call_claude(system_prompt, user_content, max_tokens=500):
    """
    Call Claude API with given prompts.

    Returns the parsed JSON response.
    Raises ValueError if API key not set, json.JSONDecodeError if response isn't valid JSON.
    """
    client = get_claude_client()

    response = client.messages.create(
        model='claude-haiku-4-5-20251001',
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{'role': 'user', 'content': user_content}],
    )

    return parse_json_response(response.content[0].text)
