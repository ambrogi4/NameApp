import React, { useState, useRef, useEffect } from 'react';
import { parseLinkedInProfile } from './apiService';

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

export default function LinkedInUpdateModal({ contact, onUpdate, onClose }) {
  const [profileText, setProfileText] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [parsed, setParsed] = useState(null);
  const [checked, setChecked] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleParse = async () => {
    if (!profileText.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await parseLinkedInProfile(profileText);
      setParsed(result);
      const initial = {};
      for (const f of FIELDS) {
        initial[f.key] = defaultChecked(f.key, contact[f.key], result[f.key]);
      }
      setChecked(initial);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = () => {
    const merged = {};
    for (const f of FIELDS) {
      if (checked[f.key] && parsed[f.key]) {
        merged[f.key] = parsed[f.key];
      }
    }
    if (profileUrl.trim()) {
      let url = profileUrl.trim();
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      merged.li_url = url;
    }
    if (Object.keys(merged).length > 0) {
      onUpdate(contact.id, merged);
    }
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      if (parsed) handleUpdate();
      else if (profileText.trim() && !loading) handleParse();
    }
  };

  const displayName = `${contact.first || ''} ${contact.last || ''}`.trim() || '(unnamed)';

  return (
    <div className="dupe-modal-overlay" onKeyDown={handleKeyDown}>
      <div className="dupe-modal-panel" style={{ maxWidth: 600 }}>
        <div className="dupe-modal-header">
          <h3 style={{ margin: 0 }}>Update from LinkedIn — {displayName}</h3>
          <button className="dupe-modal-close" onClick={onClose}>&times;</button>
        </div>

        {!parsed ? (
          <>
            <textarea
              ref={textareaRef}
              value={profileText}
              onChange={(e) => setProfileText(e.target.value)}
              placeholder="Paste LinkedIn profile text (Ctrl+A, Ctrl+C from profile page)"
              style={{ width: '100%', height: 180, fontFamily: 'inherit', fontSize: 13, padding: 8, boxSizing: 'border-box', resize: 'vertical' }}
            />
            <input
              type="text"
              value={profileUrl}
              onChange={(e) => setProfileUrl(e.target.value)}
              placeholder="LinkedIn URL (optional)"
              style={{ width: '100%', marginTop: 8, padding: 6, fontSize: 13, boxSizing: 'border-box' }}
            />
            {error && <div style={{ color: '#c62828', marginTop: 8, fontSize: 13 }}>{error}</div>}
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button
                onClick={handleParse}
                disabled={!profileText.trim() || loading}
                style={{ backgroundColor: '#1976d2', color: 'white', border: 'none', padding: '6px 16px', borderRadius: 4, cursor: 'pointer' }}
              >
                {loading ? 'Parsing...' : 'Parse'}
              </button>
              <button onClick={onClose} style={{ padding: '6px 16px', borderRadius: 4, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
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
                      {contact[f.key] || <span className="dupe-empty">&mdash;</span>}
                    </td>
                    <td className={checked[f.key] ? 'dupe-cell-selected' : 'dupe-cell'}>
                      {parsed[f.key] || <span className="dupe-empty">&mdash;</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={!!checked[f.key]}
                        onChange={() => setChecked(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                        disabled={!parsed[f.key]}
                      />
                    </td>
                  </tr>
                ))}
                {profileUrl.trim() && (
                  <tr>
                    <td className="dupe-field-name">LinkedIn</td>
                    <td className="dupe-cell">{contact.li_url || <span className="dupe-empty">&mdash;</span>}</td>
                    <td className="dupe-cell-selected">{profileUrl.trim()}</td>
                    <td style={{ textAlign: 'center', fontSize: 11, color: '#888' }}>always</td>
                  </tr>
                )}
              </tbody>
            </table>
            {error && <div style={{ color: '#c62828', marginTop: 8, fontSize: 13 }}>{error}</div>}
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button
                onClick={handleUpdate}
                style={{ backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '6px 16px', borderRadius: 4, cursor: 'pointer' }}
              >
                Update
              </button>
              <button onClick={() => setParsed(null)} style={{ padding: '6px 16px', borderRadius: 4, cursor: 'pointer' }}>
                Back
              </button>
              <button onClick={onClose} style={{ padding: '6px 16px', borderRadius: 4, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
