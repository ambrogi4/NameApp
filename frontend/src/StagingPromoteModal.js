import React, { useState, useMemo } from 'react';
import { computeMergeFields } from './dupeUtils';

export default function StagingPromoteModal({ staged, matchedContact, onPromote, onClose }) {
  const mergeFields = useMemo(
    () => computeMergeFields(staged, matchedContact),
    [staged, matchedContact]
  );

  const [choices, setChoices] = useState(() => initChoices(mergeFields));

  function initChoices(fields) {
    const c = {};
    for (const f of fields) c[f.field] = f.autoChoice;
    return c;
  }

  function handleMerge() {
    const mergeFieldsObj = {};
    for (const f of mergeFields) {
      const pick = choices[f.field];
      if (pick === 'incoming' && f.incomingVal) {
        mergeFieldsObj[f.field] = f.incomingVal;
      }
    }
    onPromote(staged.id, { merge: true, merge_fields: mergeFieldsObj });
    onClose();
  }

  function handleCreateAnyway() {
    onPromote(staged.id, { merge: false });
    onClose();
  }

  function handleSkip() {
    onClose();
  }

  function toggleChoice(field) {
    if (field === 'source') return;
    const f = mergeFields.find(mf => mf.field === field);
    if (f && (!f.existingVal || !f.incomingVal)) return;
    setChoices(prev => ({
      ...prev,
      [field]: prev[field] === 'existing' ? 'incoming' : 'existing',
    }));
  }

  const displayName = `${matchedContact.first || ''} ${matchedContact.last || ''}`.trim() || '(unnamed)';
  const stagedName = `${staged.first || ''} ${staged.last || ''}`.trim() || '(unnamed)';

  return (
    <div className="dupe-modal-overlay" onClick={onClose}>
      <div className="dupe-modal-panel" onClick={e => e.stopPropagation()}>
        <div className="dupe-modal-header">
          <span>Promote to Contact</span>
          <button className="dupe-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="dupe-modal-match" style={{ marginBottom: '8px' }}>
          <div>Staged: <strong>{stagedName}</strong></div>
          <div>Matches: <strong>{displayName}</strong> (#{matchedContact.id})</div>
        </div>
        <table className="dupe-modal-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Existing Contact</th>
              <th>Staged (Incoming)</th>
              <th>Use</th>
            </tr>
          </thead>
          <tbody>
            {mergeFields.map(f => {
              const choice = choices[f.field];
              const isSourceField = f.field === 'source';
              const isGapFill = !f.existingVal || !f.incomingVal;
              const canToggle = !isSourceField && !isGapFill;

              return (
                <tr key={f.field}>
                  <td className="dupe-field-name">{f.field}</td>
                  <td className={choice === 'existing' ? 'dupe-cell-selected' : 'dupe-cell'}>
                    {f.existingVal || <span className="dupe-empty">&mdash;</span>}
                  </td>
                  <td className={choice === 'incoming' ? 'dupe-cell-selected' : 'dupe-cell'}>
                    {f.incomingVal || <span className="dupe-empty">&mdash;</span>}
                  </td>
                  <td>
                    {isSourceField ? (
                      <span className="dupe-auto-label">kept</span>
                    ) : isGapFill ? (
                      <span className="dupe-auto-label">auto</span>
                    ) : (
                      <button
                        className="dupe-toggle-btn"
                        onClick={() => toggleChoice(f.field)}
                      >
                        {choice === 'incoming' ? '\u2190' : '\u2192'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {mergeFields.length === 0 && (
          <div className="dupe-modal-no-diff">No field differences — exact duplicate. Merge will have no effect.</div>
        )}
        <div className="dupe-modal-actions">
          <button className="dupe-merge-btn" onClick={handleMerge}>Merge into Contact</button>
          <button className="dupe-create-btn" onClick={handleCreateAnyway}>Create New</button>
          <button className="dupe-skip-btn" onClick={handleSkip}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
