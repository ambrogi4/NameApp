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

export default function LinkedInImportModal({ onSave, onClose }) {
  const [profileText, setProfileText] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [parsed, setParsed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef(null);
  const firstFieldRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (parsed) firstFieldRef.current?.focus();
  }, [parsed]);

  const handleProcess = async () => {
    if (!profileText.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await parseLinkedInProfile(profileText);
      setParsed(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key, value) => {
    setParsed(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const data = { ...parsed };
    if (profileUrl.trim()) {
      let url = profileUrl.trim();
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      data.li_url = url;
    }
    onSave(data);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      if (parsed) handleSave();
      else if (profileText.trim() && !loading) handleProcess();
    }
  };

  return (
    <div className="dupe-modal-overlay" onKeyDown={handleKeyDown}>
      <div className="dupe-modal-panel" style={{ maxWidth: 520 }}>
        <div className="dupe-modal-header">
          <h3 style={{ margin: 0 }}>LinkedIn Import</h3>
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
              placeholder="Profile URL (optional)"
              style={{ width: '100%', marginTop: 8, padding: 6, fontSize: 13, boxSizing: 'border-box' }}
            />
            {error && <div style={{ color: '#c62828', marginTop: 8, fontSize: 13 }}>{error}</div>}
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button
                onClick={handleProcess}
                disabled={!profileText.trim() || loading}
                style={{ backgroundColor: '#1976d2', color: 'white', border: 'none', padding: '6px 16px', borderRadius: 4, cursor: 'pointer' }}
              >
                {loading ? 'Processing...' : 'Process'}
              </button>
              <button onClick={onClose} style={{ padding: '6px 16px', borderRadius: 4, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {FIELDS.map((f, i) => (
                  <tr key={f.key}>
                    <td style={{ padding: '4px 8px 4px 0', fontWeight: 600, width: 80, verticalAlign: 'middle' }}>{f.label}</td>
                    <td style={{ padding: '4px 0' }}>
                      <input
                        ref={i === 0 ? firstFieldRef : undefined}
                        type="text"
                        value={parsed[f.key] || ''}
                        onChange={(e) => handleFieldChange(f.key, e.target.value)}
                        style={{ width: '100%', padding: 5, fontSize: 13, boxSizing: 'border-box' }}
                      />
                    </td>
                  </tr>
                ))}
                {profileUrl.trim() && (
                  <tr>
                    <td style={{ padding: '4px 8px 4px 0', fontWeight: 600, width: 80, verticalAlign: 'middle' }}>LinkedIn</td>
                    <td style={{ padding: '4px 0', fontSize: 13, color: '#555' }}>{profileUrl.trim()}</td>
                  </tr>
                )}
              </tbody>
            </table>
            {error && <div style={{ color: '#c62828', marginTop: 8, fontSize: 13 }}>{error}</div>}
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button
                onClick={handleSave}
                style={{ backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '6px 16px', borderRadius: 4, cursor: 'pointer' }}
              >
                Save
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
