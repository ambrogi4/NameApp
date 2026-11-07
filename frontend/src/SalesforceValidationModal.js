import React from 'react';

/**
 * Modal to display Salesforce validation errors
 * Shows list of contacts with missing required fields
 */
function SalesforceValidationModal({ errors, onClose }) {
  if (!errors || errors.length === 0) return null;

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
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}
      >
        <h2 style={{ color: '#d32f2f', marginTop: 0, fontSize: '20px', marginBottom: '16px' }}>
          Salesforce Export Validation Failed
        </h2>

        <p style={{ marginBottom: '20px', fontSize: '14px', color: '#555' }}>
          The following {errors.length === 1 ? 'contact is' : 'contacts are'} missing required data and cannot be exported to Salesforce:
        </p>

        <div style={{
          maxHeight: '400px',
          overflowY: 'auto',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '12px',
          backgroundColor: '#fef5f5'
        }}>
          {errors.map((error) => (
            <div key={error.id} style={{
              marginBottom: '12px',
              paddingBottom: '12px',
              borderBottom: errors.indexOf(error) < errors.length - 1 ? '1px solid #eee' : 'none'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {error.name}
              </div>
              <div style={{ color: '#d32f2f', fontSize: '14px' }}>
                Missing: {error.missing.join(', ')}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default SalesforceValidationModal;
