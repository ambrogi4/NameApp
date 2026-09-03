import React, { useState, useRef, useEffect } from 'react';
import { createOcTransition } from './apiService';

function ColdToNurtureModal({ contact, onClose, onSuccess }) {
  const today = new Date().toISOString().slice(0, 10);
  const [transitionDate, setTransitionDate] = useState(today);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const commentRef = useRef(null);

  useEffect(() => {
    // Focus comment field on mount
    commentRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await createOcTransition({
        contact_id: contact.id,
        from_oc: 'cold',
        to_oc: 'nurture',
        transition_date: transitionDate,
        comment: comment.trim() || null,
      });
      onSuccess();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          width: '450px',
          maxWidth: '90vw',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#333' }}>
          Convert Cold to Nurture
        </h3>

        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <div style={{ fontWeight: '600', fontSize: '15px' }}>
            {contact.first} {contact.last}
          </div>
          {contact.firm && (
            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
              {contact.title ? `${contact.title} at ` : ''}{contact.firm}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
              Date
            </label>
            <input
              type="date"
              value={transitionDate}
              onChange={(e) => setTransitionDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
              Comment
            </label>
            <textarea
              ref={commentRef}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What triggered this conversion? (optional)"
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{ marginBottom: '16px', padding: '10px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                backgroundColor: '#f0f0f0',
                border: '1px solid #ccc',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Converting...' : 'Convert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ColdToNurtureModal;
