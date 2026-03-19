import React, { useState, useRef, useEffect } from 'react';
import { parseConferenceSpeakers } from './apiService';

export default function ConferenceImportModal({ onImport, onClose }) {
  const [rawText, setRawText] = useState('');
  const [source, setSource] = useState('');
  const [speakers, setSpeakers] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleParse = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await parseConferenceSpeakers(rawText);
      setSpeakers(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (idx, field, value) => {
    setSpeakers(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const handleRemove = (idx) => {
    setSpeakers(prev => prev.filter((_, i) => i !== idx));
  };

  const handleImport = () => {
    const contacts = speakers.map(s => ({
      ...s,
      source: source.trim() || undefined,
    }));
    onImport(contacts);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      if (speakers) handleImport();
      else if (rawText.trim() && !loading) handleParse();
    }
  };

  return (
    <div className="dupe-modal-overlay" onKeyDown={handleKeyDown}>
      <div className="dupe-modal-panel" style={{ maxWidth: 720, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="dupe-modal-header">
          <h3 style={{ margin: 0 }}>Conference Import</h3>
          <button className="dupe-modal-close" onClick={onClose}>&times;</button>
        </div>

        {!speakers ? (
          <>
            <textarea
              ref={textareaRef}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste conference speaker page text (Ctrl+A, Ctrl+C from speaker list page)"
              style={{ width: '100%', height: 200, fontFamily: 'inherit', fontSize: 13, padding: 8, boxSizing: 'border-box', resize: 'vertical' }}
            />
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Source / conference name (optional, applied to all contacts)"
              style={{ width: '100%', marginTop: 8, padding: 6, fontSize: 13, boxSizing: 'border-box' }}
            />
            {error && <div style={{ color: '#c62828', marginTop: 8, fontSize: 13 }}>{error}</div>}
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button
                onClick={handleParse}
                disabled={!rawText.trim() || loading}
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
            <div style={{ fontSize: 13, marginBottom: 8, color: '#555' }}>
              {speakers.length} speaker{speakers.length !== 1 ? 's' : ''} found
              {source.trim() ? ` — source: "${source.trim()}"` : ''}
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ccc' }}>
                    <th style={{ textAlign: 'left', padding: '4px 4px', fontWeight: 600 }}>First</th>
                    <th style={{ textAlign: 'left', padding: '4px 4px', fontWeight: 600 }}>Last</th>
                    <th style={{ textAlign: 'left', padding: '4px 4px', fontWeight: 600 }}>Title</th>
                    <th style={{ textAlign: 'left', padding: '4px 4px', fontWeight: 600 }}>Firm</th>
                    <th style={{ width: 30 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {speakers.map((s, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                      {['first', 'last', 'title', 'firm'].map(field => (
                        <td key={field} style={{ padding: '2px 4px' }}>
                          <input
                            type="text"
                            value={s[field] || ''}
                            onChange={(e) => handleFieldChange(i, field, e.target.value)}
                            style={{ width: '100%', padding: 3, fontSize: 13, boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: 2 }}
                          />
                        </td>
                      ))}
                      <td style={{ padding: '2px 2px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleRemove(i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 16, lineHeight: 1 }}
                          title="Remove"
                        >&times;</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {error && <div style={{ color: '#c62828', marginTop: 8, fontSize: 13 }}>{error}</div>}
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button
                onClick={handleImport}
                disabled={speakers.length === 0}
                style={{ backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '6px 16px', borderRadius: 4, cursor: 'pointer' }}
              >
                Import All ({speakers.length})
              </button>
              <button onClick={() => setSpeakers(null)} style={{ padding: '6px 16px', borderRadius: 4, cursor: 'pointer' }}>
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
