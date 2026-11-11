import React, { useEffect } from 'react';

/**
 * Modal for displaying company research results from Alt+I
 * Handles 0-3 results: single result, comparison table, or not found
 * Press ESC to close
 */
function CompanyResearchModal({ onClose, results, firmName, loading }) {
  const companies = results?.companies || [];

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
          maxWidth: '800px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>
            Company Research: {firmName}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
            }}
          >
            &times;
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              Researching company...
            </p>
          ) : companies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <p style={{ fontSize: '16px', marginBottom: '8px' }}>No company found</p>
              <p style={{ fontSize: '14px', margin: 0 }}>
                Try searching on LinkedIn or the web
              </p>
            </div>
          ) : companies.length === 1 ? (
            // Single result: detailed display
            <div style={{ fontSize: '15px', lineHeight: '1.8' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 12px', fontWeight: 'bold', width: '140px', verticalAlign: 'top' }}>
                      Company
                    </td>
                    <td style={{ padding: '8px 12px' }}>{companies[0].name}</td>
                  </tr>
                  {companies[0].tagline && (
                    <tr style={{ backgroundColor: '#f9f9f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 'bold', verticalAlign: 'top' }}>
                        Tagline
                      </td>
                      <td style={{ padding: '8px 12px' }}>{companies[0].tagline}</td>
                    </tr>
                  )}
                  {companies[0].hq && (
                    <tr>
                      <td style={{ padding: '8px 12px', fontWeight: 'bold', verticalAlign: 'top' }}>
                        Headquarters
                      </td>
                      <td style={{ padding: '8px 12px' }}>{companies[0].hq}</td>
                    </tr>
                  )}
                  {companies[0].employees && (
                    <tr style={{ backgroundColor: '#f9f9f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 'bold', verticalAlign: 'top' }}>
                        Employees
                      </td>
                      <td style={{ padding: '8px 12px' }}>{companies[0].employees}</td>
                    </tr>
                  )}
                  {companies[0].ceo && (
                    <tr>
                      <td style={{ padding: '8px 12px', fontWeight: 'bold', verticalAlign: 'top' }}>
                        CEO
                      </td>
                      <td style={{ padding: '8px 12px' }}>{companies[0].ceo}</td>
                    </tr>
                  )}
                  {companies[0].type && (
                    <tr style={{ backgroundColor: '#f9f9f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 'bold', verticalAlign: 'top' }}>
                        Type
                      </td>
                      <td style={{ padding: '8px 12px' }}>{companies[0].type}</td>
                    </tr>
                  )}
                  {companies[0].aum && (
                    <tr>
                      <td style={{ padding: '8px 12px', fontWeight: 'bold', verticalAlign: 'top' }}>
                        AUM
                      </td>
                      <td style={{ padding: '8px 12px' }}>{companies[0].aum}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            // Multiple results: comparison table
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f0f0' }}>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Company</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>HQ</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Employees</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>CEO</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Type</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>AUM</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 'bold' }}>{company.name}</div>
                        {company.tagline && (
                          <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                            {company.tagline}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px', verticalAlign: 'top' }}>{company.hq || '—'}</td>
                      <td style={{ padding: '8px', verticalAlign: 'top' }}>{company.employees || '—'}</td>
                      <td style={{ padding: '8px', verticalAlign: 'top' }}>{company.ceo || '—'}</td>
                      <td style={{ padding: '8px', verticalAlign: 'top' }}>{company.type || '—'}</td>
                      <td style={{ padding: '8px', verticalAlign: 'top' }}>{company.aum || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

export default CompanyResearchModal;
