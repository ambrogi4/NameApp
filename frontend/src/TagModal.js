import React, { useState, useRef, useEffect } from 'react';

export default function TagModal({ title, placeholder, onConfirm, onClose }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <div className="dupe-modal-overlay" onClick={onClose}>
      <div className="dupe-modal-panel" style={{ width: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="dupe-modal-header">
          <span>{title}</span>
          <button className="dupe-modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            style={{ width: '100%', padding: '8px', fontSize: 14, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button type="submit" className="dupe-merge-btn">Confirm</button>
            <button type="button" className="dupe-skip-btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
