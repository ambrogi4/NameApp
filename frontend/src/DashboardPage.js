import React, { useState, useEffect, useCallback } from 'react';
import { fetchDashboardMetrics } from './apiService';

function DashboardPage({ onMetricsUpdate }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchDashboardMetrics();
      setMetrics(data);
      setError(null);
      if (onMetricsUpdate) {
        onMetricsUpdate(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [onMetricsUpdate]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Refresh when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadMetrics();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadMetrics]);

  if (loading && !metrics) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#dc3545' }}>
        Error: {error}
        <br />
        <button onClick={loadMetrics} style={{ marginTop: '10px' }}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div style={{
          backgroundColor: '#fff',
          border: '2px solid #2196F3',
          borderRadius: '12px',
          padding: '40px 60px',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(33, 150, 243, 0.15)',
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#666',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '8px',
          }}>
            Cold Outreach
          </div>
          <div style={{
            fontSize: '12px',
            color: '#999',
            marginBottom: '20px',
          }}>
            Today
          </div>
          <div style={{
            fontSize: '72px',
            fontWeight: '700',
            color: '#2196F3',
            lineHeight: 1,
          }}>
            {metrics?.cold_outreach_today ?? 0}
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '40px',
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        flexWrap: 'wrap',
      }}>
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '20px 30px',
          textAlign: 'center',
          minWidth: '140px',
        }}>
          <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '8px' }}>
            This Week
          </div>
          <div style={{ fontSize: '28px', fontWeight: '600', color: '#495057' }}>
            {metrics?.cold_outreach_this_week ?? 0}
          </div>
        </div>

        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '20px 30px',
          textAlign: 'center',
          minWidth: '140px',
        }}>
          <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '8px' }}>
            This Month
          </div>
          <div style={{ fontSize: '28px', fontWeight: '600', color: '#495057' }}>
            {metrics?.cold_outreach_this_month ?? 0}
          </div>
        </div>

        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '20px 30px',
          textAlign: 'center',
          minWidth: '140px',
        }}>
          <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '8px' }}>
            All Outreach Today
          </div>
          <div style={{ fontSize: '28px', fontWeight: '600', color: '#495057' }}>
            {metrics?.all_outreach_today ?? 0}
          </div>
        </div>
      </div>

      {metrics?.breakdown_today && Object.keys(metrics.breakdown_today).length > 0 && (
        <div style={{ marginTop: '30px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
            Today by Category
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
            {Object.entries(metrics.breakdown_today).map(([cat, count]) => (
              <span key={cat} style={{
                backgroundColor: '#e9ecef',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '13px',
              }}>
                {cat}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <button
          onClick={loadMetrics}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            cursor: 'pointer',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
          }}
        >
          Refresh
        </button>
      </div>
    </div>
  );
}

export default DashboardPage;
