import React, { useState, useMemo, useCallback } from 'react';
import templates from './fancyFilterTemplates';
import TypeAheadInput from './TypeAheadInput';

function FancyFilterPanel({ contacts, content, onRun, resultCount }) {
  const [templateId, setTemplateId] = useState('');
  const [params, setParams] = useState({});

  const template = templates.find(t => t.id === templateId);

  const handleTemplateChange = useCallback((e) => {
    setTemplateId(e.target.value);
    setParams({});
  }, []);

  const setParam = useCallback((key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  }, []);

  // Build options for each param type from live data
  const firmOptions = useMemo(() => {
    const firms = [...new Set(contacts.map(c => c.firm).filter(Boolean))].sort();
    return firms.map(f => ({ value: f, label: f }));
  }, [contacts]);

  const contactOptions = useMemo(() =>
    contacts.map(c => ({ value: String(c.id), label: `${c.first} ${c.last}` })),
    [contacts]
  );

  const contentOptions = useMemo(() =>
    content.map(c => ({ value: String(c.id), label: c.short_name || c.title || `#${c.id}` })),
    [content]
  );

  const tagOptions = useMemo(() => {
    const tags = new Set();
    contacts.forEach(c => {
      (c.tags || '').split(',').forEach(t => {
        const trimmed = t.trim();
        if (trimmed) tags.add(trimmed);
      });
    });
    return [...tags].sort().map(t => ({ value: t, label: t }));
  }, [contacts]);

  const getOptionsForType = (type) => {
    switch (type) {
      case 'firm': return firmOptions;
      case 'contact': return contactOptions;
      case 'content': return contentOptions;
      case 'tag': return tagOptions;
      default: return [];
    }
  };

  const allRequiredFilled = template
    ? template.params.filter(p => p.required).every(p => params[p.key])
    : false;

  const handleRun = () => {
    if (template && allRequiredFilled) {
      onRun(template, params);
    }
  };

  return (
    <div className="fancy-filter-controls">
      <select
        className="fancy-filter-select"
        value={templateId}
        onChange={handleTemplateChange}
      >
        <option value="">Select a query...</option>
        {templates.map(t => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
      </select>

      {template && template.params.map(p => (
        <div key={p.key} className="fancy-filter-param">
          {p.type === 'date' ? (
            <input
              type="date"
              className="fancy-filter-date"
              value={params[p.key] || ''}
              onChange={(e) => setParam(p.key, e.target.value)}
              title={p.label}
            />
          ) : (
            <TypeAheadInput
              options={getOptionsForType(p.type)}
              value={params[p.key] || ''}
              onChange={(val) => setParam(p.key, val)}
              placeholder={p.label}
            />
          )}
        </div>
      ))}

      {template && (
        <button
          className="fancy-filter-run"
          onClick={handleRun}
          disabled={!allRequiredFilled}
        >
          Run
        </button>
      )}

      {resultCount !== null && (
        <span className="fancy-filter-count">{resultCount} result{resultCount !== 1 ? 's' : ''}</span>
      )}
    </div>
  );
}

export default FancyFilterPanel;
