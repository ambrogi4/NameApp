import React, { useState, useEffect } from 'react';

const FIELDS = [
  { key: 'first', label: 'First' },
  { key: 'last', label: 'Last' },
  { key: 'title', label: 'Title' },
  { key: 'firm', label: 'Firm' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'education', label: 'Education' },
];

// first/last: only prefer new when existing is empty
// all others: always prefer new
function defaultChecked(key, existingVal, newVal) {
  if (!newVal) return false;
  if (key === 'first' || key === 'last') return !existingVal;
  return true;
}

export default function LinkedInStagingUpdateModal({
  stagedContact,
  newProfile,
  profileUrl,
  sourceType,
  comment,
  onUpdate,
  onClose
}) {
  const [checked, setChecked] = useState({});

  useEffect(() => {
    // Initialize checked state based on field comparison
    const initial = {};
    for (const f of FIELDS) {
      initial[f.key] = defaultChecked(f.key, stagedContact[f.key], newProfile[f.key]);
    }
    setChecked(initial);
  }, [stagedContact, newProfile]);

  const handleUpdate = () => {
    const merged = {};
    for (const f of FIELDS) {
      if (checked[f.key] && newProfile[f.key]) {
        merged[f.key] = newProfile[f.key];
      }
    }
    // Always include li_url from new profile
    if (profileUrl) {
      let url = profileUrl.trim();
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      merged.li_url = url;
    }
    // If sourceType is linkedin_update_cr, set source_type to trigger CR activity on promote
    if (sourceType === 'linkedin_update_cr') {
      merged.source_type = 'linkedin_import_cr';
    }
    // Include comment if provided
    if (comment) {
      merged.comment = comment;
    }
    onUpdate(stagedContact.id, merged);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleUpdate();
    }
  };

  const displayName = `${stagedContact.first || ''} ${stagedContact.last || ''}`.trim() || '(unnamed)';

  return (
    <div className="dupe-modal-overlay" onKeyDown={handleKeyDown}>
      <div className="dupe-modal-panel" style={{ maxWidth: 600 }}>
        <div className="dupe-modal-header">
          <h3 style={{ margin: 0 }}>
            Update from LinkedIn — {displayName}
            {sourceType === 'linkedin_update_cr' && (
              <span style={{ marginLeft: 8, fontSize: 12, color: '#388e3c', fontWeight: 'normal' }}>
                + CR
              </span>
            )}
          </h3>
          <button className="dupe-modal-close" onClick={onClose}>&times;</button>
        </div>

        <table className="dupe-modal-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Existing</th>
              <th>New</th>
              <th>Use</th>
            </tr>
          </thead>
          <tbody>
            {FIELDS.map(f => (
              <tr key={f.key}>
                <td className="dupe-field-name">{f.label}</td>
                <td className={!checked[f.key] ? 'dupe-cell-selected' : 'dupe-cell'}>
                  {stagedContact[f.key] || <span className="dupe-empty">&mdash;</span>}
                </td>
                <td className={checked[f.key] ? 'dupe-cell-selected' : 'dupe-cell'}>
                  {newProfile[f.key] || <span className="dupe-empty">&mdash;</span>}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={!!checked[f.key]}
                    onChange={() => setChecked(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                    disabled={!newProfile[f.key]}
                  />
                </td>
              </tr>
            ))}
            {profileUrl && (
              <tr>
                <td className="dupe-field-name">LinkedIn</td>
                <td className="dupe-cell">{stagedContact.li_url || <span className="dupe-empty">&mdash;</span>}</td>
                <td className="dupe-cell-selected">{profileUrl}</td>
                <td style={{ textAlign: 'center', fontSize: 11, color: '#888' }}>always</td>
              </tr>
            )}
            {sourceType === 'linkedin_update_cr' && (
              <tr>
                <td className="dupe-field-name">Source Type</td>
                <td className="dupe-cell">{stagedContact.source_type || <span className="dupe-empty">&mdash;</span>}</td>
                <td className="dupe-cell-selected">linkedin_import_cr</td>
                <td style={{ textAlign: 'center', fontSize: 11, color: '#888' }}>always</td>
              </tr>
            )}
            {comment && (
              <tr>
                <td className="dupe-field-name">Comment</td>
                <td className="dupe-cell"><span className="dupe-empty">&mdash;</span></td>
                <td className="dupe-cell-selected" style={{ fontStyle: 'italic' }}>{comment}</td>
                <td style={{ textAlign: 'center', fontSize: 11, color: '#888' }}>always</td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button
            onClick={handleUpdate}
            style={{ backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '6px 16px', borderRadius: 4, cursor: 'pointer' }}
          >
            Update
          </button>
          <button onClick={onClose} style={{ padding: '6px 16px', borderRadius: 4, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
