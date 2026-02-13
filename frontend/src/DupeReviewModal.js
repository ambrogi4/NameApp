import React, { useState, useMemo } from 'react';
import { computeMergeFields } from './dupeUtils';

export default function DupeReviewModal({ dupes, onMerge, onSkip, onCreateAnyway, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const current = dupes[currentIndex];
  const { incoming, existing, matchType } = current;

  const mergeFields = useMemo(
    () => computeMergeFields(incoming, existing),
    [incoming, existing]
  );

  const [choices, setChoices] = useState(() => initChoices(mergeFields));

  function initChoices(fields) {
    const c = {};
    for (const f of fields) c[f.field] = f.autoChoice;
    return c;
  }

  function advance() {
    if (currentIndex < dupes.length - 1) {
      const nextIdx = currentIndex + 1;
      const nextDupe = dupes[nextIdx];
      const nextFields = computeMergeFields(nextDupe.incoming, nextDupe.existing);
      setCurrentIndex(nextIdx);
      setChoices(initChoices(nextFields));
    } else {
      onClose();
    }
  }

  function handleMerge() {
    const merged = {};
    for (const f of mergeFields) {
      const pick = choices[f.field];
      if (pick === 'incoming' && f.incomingVal) {
        merged[f.field] = f.incomingVal;
      }
      // If pick is 'existing', no need to send — it's already there
    }
    onMerge(existing.id, merged);
    advance();
  }

  function handleSkip() {
    if (onSkip) onSkip();
    advance();
  }

  function handleCreateAnyway() {
    onCreateAnyway(incoming);
    advance();
  }

  function toggleChoice(field) {
    // Don't allow toggling source
    if (field === 'source') return;
    // Don't allow toggling gap-fills (one side empty)
    const f = mergeFields.find(mf => mf.field === field);
    if (f && (!f.existingVal || !f.incomingVal)) return;
    setChoices(prev => ({
      ...prev,
      [field]: prev[field] === 'existing' ? 'incoming' : 'existing',
    }));
  }

  const displayName = `${existing.first || ''} ${existing.last || ''}`.trim() || '(unnamed)';

  return (
    <div className="dupe-modal-overlay" onClick={onClose}>
      <div className="dupe-modal-panel" onClick={e => e.stopPropagation()}>
        <div className="dupe-modal-header">
          <span>Duplicate Review ({currentIndex + 1} of {dupes.length})</span>
          <button className="dupe-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="dupe-modal-match">
          Match: <strong>{displayName}</strong> (via {matchType})
        </div>
        <table className="dupe-modal-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Existing</th>
              <th>Incoming</th>
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
          <div className="dupe-modal-no-diff">No field differences — exact duplicate.</div>
        )}
        <div className="dupe-modal-actions">
          <button className="dupe-merge-btn" onClick={handleMerge}>Apply Merge</button>
          <button className="dupe-skip-btn" onClick={handleSkip}>Skip</button>
          <button className="dupe-create-btn" onClick={handleCreateAnyway}>Create Anyway</button>
        </div>
      </div>
    </div>
  );
}
