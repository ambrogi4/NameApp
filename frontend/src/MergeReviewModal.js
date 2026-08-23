import React, { useState, useMemo } from 'react';
import { computeMergeFields } from './dupeUtils';

/**
 * Generic merge review modal for duplicate detection and staging promote workflows.
 * Handles a queue of items, showing one at a time with pagination.
 *
 * Props:
 * - items: [{ incoming, existing, matchType }] - queue of items to review
 * - title: string - modal title (e.g., "Duplicate Review" or "Promote to Contact")
 * - existingLabel: string - column header for existing data (e.g., "Existing" or "Existing Contact")
 * - incomingLabel: string - column header for incoming data (e.g., "Incoming" or "Staged (Incoming)")
 * - mergeLabel: string - label for merge button (e.g., "Apply Merge" or "Merge into Contact")
 * - createLabel: string - label for create button (e.g., "Create Anyway" or "Create New")
 * - skipLabel: string - label for skip button (e.g., "Skip" or "Cancel")
 * - showSkip: boolean - whether to show skip button (default true)
 * - onMerge: (existingId, mergedFields, incoming) => void - called when user merges
 * - onSkip: () => void - called when user skips (optional)
 * - onCreateAnyway: (incoming, existing) => void - called when user creates anyway
 * - onClose: () => void - called when modal should close
 */
export default function MergeReviewModal({
  items,
  title = 'Duplicate Review',
  existingLabel = 'Existing',
  incomingLabel = 'Incoming',
  mergeLabel = 'Apply Merge',
  createLabel = 'Create Anyway',
  skipLabel = 'Skip',
  showSkip = true,
  onMerge,
  onSkip,
  onCreateAnyway,
  onClose,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const current = items[currentIndex];
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
    if (currentIndex < items.length - 1) {
      const nextIdx = currentIndex + 1;
      const nextItem = items[nextIdx];
      const nextFields = computeMergeFields(nextItem.incoming, nextItem.existing);
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
    onMerge(existing.id, merged, incoming);
    advance();
  }

  function handleSkip() {
    if (onSkip) onSkip();
    advance();
  }

  function handleCreateAnyway() {
    onCreateAnyway(incoming, existing);
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
          <span>{title} ({currentIndex + 1} of {items.length})</span>
          <button className="dupe-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="dupe-modal-match">
          Match: <strong>{displayName}</strong> (via {matchType})
        </div>
        <table className="dupe-modal-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>{existingLabel}</th>
              <th>{incomingLabel}</th>
              <th>Use</th>
            </tr>
          </thead>
          <tbody>
            {mergeFields.map(f => {
              const choice = choices[f.field];
              const isSourceField = f.field === 'source';
              const isGapFill = !f.existingVal || !f.incomingVal;

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
          <button className="dupe-merge-btn" onClick={handleMerge}>{mergeLabel}</button>
          {showSkip && (
            <button className="dupe-skip-btn" onClick={handleSkip}>{skipLabel}</button>
          )}
          <button className="dupe-create-btn" onClick={handleCreateAnyway}>{createLabel}</button>
        </div>
      </div>
    </div>
  );
}
