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

// Escalating delete confirmation: simple confirm for ≤5, type count for 6+
export function confirmBulkDelete(count, itemLabel = 'record') {
  const plural = count === 1 ? itemLabel : itemLabel + 's';
  if (count <= 5) {
    return window.confirm(`Delete ${count} ${plural}?`);
  }
  const input = window.prompt(
    `You are about to delete ${count} ${plural}.\n\nType "${count}" to confirm:`
  );
  return input !== null && input.trim() === String(count);
}

export function copyRowsToClipboard(api) {
  const colState = api.getColumnState();
  const visibleCols = colState.filter(c => {
    if (c.hide) return false;
    const col = api.getColumn(c.colId);
    const colDef = col?.getColDef();
    if (!colDef?.field || colDef.field === 'id') return false;
    return true;
  });
  if (visibleCols.length === 0) return;

  const selectedNodes = api.getSelectedNodes().filter(n => !n.rowPinned);
  let nodes = selectedNodes.length > 0 ? selectedNodes : [];
  if (nodes.length === 0) {
    const cell = api.getFocusedCell();
    if (cell && cell.rowPinned !== 'bottom') {
      const node = api.getDisplayedRowAtIndex(cell.rowIndex);
      if (node) nodes = [node];
    }
  }
  if (nodes.length === 0) return;

  const headers = visibleCols.map(c => {
    const col = api.getColumn(c.colId);
    const colDef = col?.getColDef();
    return colDef?.headerName || colDef?.field || c.colId;
  });

  const rows = nodes.map(node =>
    visibleCols.map(c => {
      const col = api.getColumn(c.colId);
      const colDef = col?.getColDef();
      const value = node.data[c.colId];
      if (colDef?.valueFormatter) {
        const result = colDef.valueFormatter({ value, data: node.data, node });
        return result ?? '';
      }
      if (value == null) return '';
      if (typeof value === 'boolean') return value ? 'true' : 'false';
      return String(value);
    }).join('\t')
  );

  const text = [headers.join('\t'), ...rows].join('\n');

  // navigator.clipboard requires secure context (HTTPS or localhost)
  // On HTTP (e.g., Tailscale IP access), this will fail
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    navigator.clipboard.writeText(text)
      .then(() => showCopyFeedback(true, rows.length))
      .catch(() => fallbackCopy(text, rows.length));
  } else {
    fallbackCopy(text, rows.length);
  }
}

function fallbackCopy(text, rowCount) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();

  let success = false;
  try {
    success = document.execCommand('copy');
  } catch (e) {
    success = false;
  }
  document.body.removeChild(ta);
  showCopyFeedback(success, rowCount);
}

function showCopyFeedback(success, rowCount) {
  // Remove any existing feedback
  const existing = document.getElementById('copy-feedback');
  if (existing) existing.remove();

  const msg = success
    ? `Copied ${rowCount} row${rowCount > 1 ? 's' : ''}`
    : 'Copy failed — use HTTPS for clipboard access';

  const div = document.createElement('div');
  div.id = 'copy-feedback';
  div.textContent = msg;
  div.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 10px 16px;
    background: ${success ? '#28a745' : '#dc3545'};
    color: white;
    border-radius: 4px;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  `;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2500);
}

export function isPinnedRow(params) {
  return params.node.rowPinned === 'bottom';
}

export function createEmptyRow(fields, overrides = {}) {
  const row = {};
  fields.forEach(f => { row[f] = ''; });
  // Default activity_date to today
  if (fields.includes('activity_date')) {
    row['activity_date'] = new Date().toISOString().slice(0, 10);
  }
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
