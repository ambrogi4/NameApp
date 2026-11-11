import React, { useState } from 'react';

/**
 * Modal for importing Salesforce owner status updates from CSV
 * Expected CSV format: mycrm_id,sf_owner_status
 * Validates all values before updating, shows summary after completion
 */
function SfOwnerImportModal({ onClose, onImport }) {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [summary, setSummary] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setSummary(null);
  };

  const handleImport = async () => {
    if (!file) {
      alert('Please select a CSV file.');
      return;
    }

    setProcessing(true);
    setSummary(null);

    try {
      const text = await file.text();
      const lines = text.trim().split('\n');

      if (lines.length < 2) {
        alert('CSV file is empty or has no data rows.');
        setProcessing(false);
        return;
      }

      // Parse header
      const header = lines[0].split(',').map(h => h.trim());
      const idIdx = header.indexOf('mycrm_id');
      const statusIdx = header.indexOf('sf_owner_status');

      if (idIdx === -1 || statusIdx === -1) {
        alert('CSV must have columns: mycrm_id, sf_owner_status');
        setProcessing(false);
        return;
      }

      // Parse data rows
      const updates = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cells = line.split(',').map(c => c.trim());
        const mycrm_id = cells[idIdx];
        const sf_owner_status = cells[statusIdx] || null;

        // Validate sf_owner_status
        if (sf_owner_status !== null && sf_owner_status !== '' &&
            !['my', 'colleague', 'NISF'].includes(sf_owner_status)) {
          alert(`Invalid sf_owner_status value on line ${i + 1}: "${sf_owner_status}"\nValid values: my, colleague, NISF, or blank`);
          setProcessing(false);
          return;
        }

        updates.push({
          mycrm_id: parseInt(mycrm_id, 10),
          sf_owner_status: sf_owner_status === '' ? null : sf_owner_status
        });
      }

      // Call parent import handler
      const result = await onImport(updates);
      setSummary(result);
    } catch (error) {
      alert(`Error processing file: ${error.message}`);
    } finally {
      setProcessing(false);
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Import Salesforce Owner Status</h2>
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
          {!summary ? (
            <>
              <p>
                Upload a CSV file with columns: <strong>mycrm_id</strong>, <strong>sf_owner_status</strong>
              </p>
              <p>
                Valid sf_owner_status values: <code>my</code>, <code>colleague</code>, <code>NISF</code>, or blank (NULL)
              </p>

              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={processing}
                style={{ marginTop: '12px' }}
              />

              {file && (
                <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                  Selected: {file.name}
                </p>
              )}
            </>
          ) : (
            <div style={{ fontSize: '16px', lineHeight: '1.8' }}>
              <h3 style={{ marginTop: 0 }}>Import Complete</h3>
              <p><strong>Updated:</strong> {summary.updated}</p>
              <p><strong>Unchanged:</strong> {summary.unchanged}</p>
              <p><strong>Unknown mycrm_id:</strong> {summary.unknown}</p>
            </div>
          )}
        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          {!summary ? (
            <>
              <button
                onClick={handleImport}
                disabled={!file || processing}
                style={{
                  padding: '8px 16px',
                  backgroundColor: !file || processing ? '#ccc' : '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: !file || processing ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {processing ? 'Importing...' : 'Import'}
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
            </>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}

export default SfOwnerImportModal;
