import React, { useState } from 'react';
import { fetchUrlContent } from './apiService';

export default function ContentUrlFetcher({ onFetched }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchUrlContent(trimmed);
      onFetched(data);
      setUrl('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="quick-add-row">
      <span className="quick-add-label">URL Fetch</span>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste article, YouTube, or PDF URL..."
        disabled={loading}
        required
        style={{ flex: 1 }}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Fetching...' : 'Fetch'}
      </button>
      {error && <span style={{ color: '#d32f2f', fontSize: 12, marginLeft: 8 }}>{error}</span>}
    </form>
  );
}
