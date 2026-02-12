export const CHANNELS = ['linkedin', 'email', 'phone', 'text', 'in_person', 'other'];
export const CONTENT_TYPES = ['pdf', 'youtube', 'article', 'podcast', 'webinar'];

export const CONTACT_FIELDS = [
  'first', 'last', 'title', 'firm', 'source', 'education',
  'tags', 'comment', 'email', 'phone', 'street', 'city',
  'state', 'zip', 'country', 'li_url', 'photo_url',
  'in_crm', 'index_1', 'index_2',
];

export const ACTIVITY_FIELDS = [
  'contact_id', 'content_id', 'activity_date', 'channel',
  'contact_responded', 'email_opened', 'topic', 'comment', 'in_crm',
];

export const CONTENT_FIELDS = [
  'type', 'short_name', 'title', 'author',
  'publish_date', 'link', 'tags', 'comment',
];

export function isPinnedRow(params) {
  return params.node.rowPinned === 'bottom';
}

export function createEmptyRow(fields, overrides = {}) {
  const row = {};
  fields.forEach(f => { row[f] = ''; });
  // Default booleans to false
  ['in_crm', 'contact_responded', 'email_opened'].forEach(f => {
    if (fields.includes(f)) row[f] = false;
  });
  // Default integers to null
  ['index_1', 'index_2'].forEach(f => {
    if (fields.includes(f)) row[f] = null;
  });
  return { ...row, ...overrides };
}
