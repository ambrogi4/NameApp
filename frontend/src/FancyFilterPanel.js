import React, { useState, useMemo, useCallback } from 'react';
import templates from './fancyFilterTemplates';
import TypeAheadInput from './TypeAheadInput';

// Group templates by the first word of their label (Activities, Contacts, Content, etc.)
const groupedTemplates = (() => {
  const groups = [];
  let currentGroup = null;
  templates.forEach(t => {
    const group = t.label.split(' ')[0];
    if (group !== currentGroup) {
      groups.push({ label: group, items: [] });
      currentGroup = group;
    }
    groups[groups.length - 1].items.push(t);
  });
  return groups;
})();

function FancyFilterPanel({ contacts, content, onRun, resultCount, lightMode }) {
  const [templateId, setTemplateId] = useState('');
  const [params, setParams] = useState({});

  const template = templates.find(t => t.id === templateId);

  const handleTemplateChange = useCallback((e) => {
    const id = e.target.value;
    setTemplateId(id);
    const tmpl = templates.find(t => t.id === id);
    const defaults = {};
    if (tmpl) {
      tmpl.params.forEach(p => {
        if (p.defaultValue) {
          defaults[p.key] = typeof p.defaultValue === 'function' ? p.defaultValue() : p.defaultValue;
        }
      });
    }
    setParams(defaults);
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

  const selectClass = lightMode ? 'filter-select' : 'fancy-filter-select';
  const dateClass = lightMode ? 'filter-date' : 'fancy-filter-date';
  const runClass = lightMode ? 'filter-run' : 'fancy-filter-run';
  const countClass = lightMode ? 'filter-count' : 'fancy-filter-count';
  const controlsClass = lightMode ? 'filter-controls' : 'fancy-filter-controls';

  return (
    <div className={controlsClass}>
      <select
        className={selectClass}
        value={templateId}
        onChange={handleTemplateChange}
      >
        <option value="">Select a query...</option>
        {groupedTemplates.map(g => (
          <optgroup key={g.label} label={g.label}>
            {g.items.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </optgroup>
        ))}
      </select>

      {template && template.params.map(p => (
        <div key={p.key} className="fancy-filter-param">
          {p.type === 'date' ? (
            <input
              type="date"
              className={dateClass}
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
              lightMode={lightMode}
            />
          )}
        </div>
      ))}

      {template && (
        <button
          className={runClass}
          onClick={handleRun}
          disabled={!allRequiredFilled}
        >
          Run
        </button>
      )}

      {resultCount !== null && (
        <span className={countClass}>{resultCount} result{resultCount !== 1 ? 's' : ''}</span>
      )}
    </div>
  );
}

export default FancyFilterPanel;
