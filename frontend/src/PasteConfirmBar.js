import React, { useEffect, useRef } from 'react';

const barStyle = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  padding: '10px 20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px',
  zIndex: 1000,
  fontSize: '14px',
};

const confirmStyle = { ...barStyle, background: '#1a1a2e', color: '#e0e0e0', borderTop: '2px solid #4CAF50' };
const undoStyle = { ...barStyle, background: '#1a1a2e', color: '#e0e0e0', borderTop: '2px solid #2196F3' };

const btnBase = {
  padding: '5px 16px',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '13px',
};

export default function PasteConfirmBar({ pendingPaste, lastPasteCount, onConfirm, onCancel, onUndo, onDismissUndo }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (lastPasteCount > 0) {
      timerRef.current = setTimeout(onDismissUndo, 8000);
      return () => clearTimeout(timerRef.current);
    }
  }, [lastPasteCount, onDismissUndo]);

  if (pendingPaste) {
    const n = pendingPaste.rows.length;
    const mode = pendingPaste.headerMode ? 'header-mapped' : 'positional';
    return (
      <div style={confirmStyle}>
        <span>{n} row{n !== 1 ? 's' : ''} parsed ({mode}). Create contacts?</span>
        <button style={{ ...btnBase, background: '#4CAF50', color: 'white' }} onClick={onConfirm}>Create</button>
        <button style={{ ...btnBase, background: '#555', color: '#ddd' }} onClick={onCancel}>Cancel</button>
      </div>
    );
  }

  if (lastPasteCount > 0) {
    return (
      <div style={undoStyle}>
        <span>Created {lastPasteCount} contact{lastPasteCount !== 1 ? 's' : ''}.</span>
        <button style={{ ...btnBase, background: '#2196F3', color: 'white' }} onClick={onUndo}>Undo</button>
      </div>
    );
  }

  return null;
}
