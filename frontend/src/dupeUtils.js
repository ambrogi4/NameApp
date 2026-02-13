import { CONTACT_FIELDS } from './gridUtils';

/**
 * Find a single duplicate for an incoming contact row.
 * Returns { existing, matchType } or null.
 */
export function findDuplicate(incoming, contacts) {
  // Priority 1: li_url exact match
  const incomingUrl = (incoming.li_url || '').trim().toLowerCase();
  if (incomingUrl) {
    for (const c of contacts) {
      const existingUrl = (c.li_url || '').trim().toLowerCase();
      if (existingUrl && existingUrl === incomingUrl) {
        return { existing: c, matchType: 'LinkedIn URL' };
      }
    }
  }

  // Priority 2: first + last case-insensitive
  const inFirst = (incoming.first || '').trim().toLowerCase();
  const inLast = (incoming.last || '').trim().toLowerCase();
  if (inFirst && inLast) {
    for (const c of contacts) {
      const exFirst = (c.first || '').trim().toLowerCase();
      const exLast = (c.last || '').trim().toLowerCase();
      if (exFirst === inFirst && exLast === inLast) {
        return { existing: c, matchType: 'name match' };
      }
    }
  }

  return null;
}

/**
 * Batch version: partition an array of incoming rows into newRows and dupe pairs.
 * Also detects dupes among the incoming rows themselves (first occurrence wins).
 */
export function findDuplicates(incomingArray, contacts) {
  const newRows = [];
  const dupes = [];
  // Track contacts + newly accepted rows to catch intra-batch dupes
  const allContacts = [...contacts];

  for (const incoming of incomingArray) {
    const match = findDuplicate(incoming, allContacts);
    if (match) {
      dupes.push({ incoming, existing: match.existing, matchType: match.matchType });
    } else {
      newRows.push(incoming);
      // Add to allContacts so subsequent rows can detect intra-batch dupes
      allContacts.push(incoming);
    }
  }

  return { newRows, dupes };
}

/**
 * Compute merge field data for the review modal.
 * Returns array of { field, label, existingVal, incomingVal, autoChoice }
 * Only includes fields where there's something to decide (skips identical/both-empty).
 */
export function computeMergeFields(incoming, existing) {
  const SKIP_FIELDS = ['id', 'created_at', 'updated_at'];
  const fields = CONTACT_FIELDS.filter(f => !SKIP_FIELDS.includes(f));
  const result = [];

  for (const field of fields) {
    const existingVal = existing[field] ?? '';
    const incomingVal = incoming[field] ?? '';

    const exStr = String(existingVal).trim();
    const inStr = String(incomingVal).trim();

    // Skip if both empty or identical
    if (exStr === inStr) continue;
    // Skip if both are falsy (covers false/null/'')
    if (!exStr && !inStr) continue;

    let autoChoice;
    if (field === 'source') {
      // Source: always keep existing
      autoChoice = 'existing';
    } else if (!exStr && inStr) {
      // Existing empty, incoming has data → fill gap
      autoChoice = 'incoming';
    } else if (exStr && !inStr) {
      // Existing has data, incoming empty → keep existing (never erase)
      autoChoice = 'existing';
    } else {
      // Both have data, values differ → default to incoming (newer)
      autoChoice = 'incoming';
    }

    result.push({
      field,
      existingVal: exStr,
      incomingVal: inStr,
      autoChoice,
    });
  }

  return result;
}
