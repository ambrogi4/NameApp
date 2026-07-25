import React, { useState, useMemo, useCallback } from 'react';
import templates from './fancyFilterTemplates';
import TypeAheadInput from './TypeAheadInput';
import { CHANNELS } from './gridUtils';

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

// ── Date helpers for saved queries ───────────────────────────────────────────
function getStartOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(d.setDate(diff)).toISOString().slice(0, 10);
}

function getStartOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function getStartOfQuarter() {
  const d = new Date();
  const quarter = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), quarter * 3, 1).toISOString().slice(0, 10);
}

function getDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// ── Saved queries (hardcoded parameters, immediate execution) ────────────────
const savedQueries = [
  // Activities
  {
    id: 'activity_by_channel_week',
    label: 'Activity by channel this week',
    group: 'Activities',
    resultType: 'pivot',
    execute: (data) => {
      const startDate = getStartOfWeek();
      const { activities } = data;
      const filtered = activities.filter(a => (a.activity_date || '') >= startDate);
      const counts = {};
      CHANNELS.forEach(ch => counts[ch] = 0);
      filtered.forEach(a => {
        if (a.channel && counts.hasOwnProperty(a.channel)) {
          counts[a.channel]++;
        }
      });
      return Object.entries(counts).map(([channel, count]) => ({ channel, count }));
    },
  },
  {
    id: 'activity_by_channel_month',
    label: 'Activity by channel this month',
    group: 'Activities',
    resultType: 'pivot',
    execute: (data) => {
      const startDate = getStartOfMonth();
      const { activities } = data;
      const filtered = activities.filter(a => (a.activity_date || '') >= startDate);
      const counts = {};
      CHANNELS.forEach(ch => counts[ch] = 0);
      filtered.forEach(a => {
        if (a.channel && counts.hasOwnProperty(a.channel)) {
          counts[a.channel]++;
        }
      });
      return Object.entries(counts).map(([channel, count]) => ({ channel, count }));
    },
  },
  {
    id: 'activity_by_channel_quarter',
    label: 'Activity by channel this quarter',
    group: 'Activities',
    resultType: 'pivot',
    execute: (data) => {
      const startDate = getStartOfQuarter();
      const { activities } = data;
      const filtered = activities.filter(a => (a.activity_date || '') >= startDate);
      const counts = {};
      CHANNELS.forEach(ch => counts[ch] = 0);
      filtered.forEach(a => {
        if (a.channel && counts.hasOwnProperty(a.channel)) {
          counts[a.channel]++;
        }
      });
      return Object.entries(counts).map(([channel, count]) => ({ channel, count }));
    },
  },
  // Contacts
  {
    id: 'target1_no_activity_2weeks',
    label: 'Contacts with tag Target1 with no activity since 2 weeks',
    group: 'Contacts',
    resultType: 'contacts',
    execute: (data) => {
      const sinceDate = getDaysAgo(14);
      const { contacts, activities } = data;
      const taggedContacts = contacts.filter(c => {
        const tags = (c.tags || '').split(',').map(t => t.trim().toLowerCase());
        return tags.includes('target1');
      });
      return taggedContacts.filter(c => {
        const contactActivities = activities.filter(a => a.contact_id === c.id);
        if (contactActivities.length === 0) return true;
        const latest = contactActivities.reduce((max, a) =>
          (a.activity_date || '') > (max.activity_date || '') ? a : max
        );
        return (latest.activity_date || '') < sinceDate;
      });
    },
  },
  {
    id: 'target1_no_activity_1month',
    label: 'Contacts with tag Target1 with no activity since 1 month',
    group: 'Contacts',
    resultType: 'contacts',
    execute: (data) => {
      const sinceDate = getDaysAgo(30);
      const { contacts, activities } = data;
      const taggedContacts = contacts.filter(c => {
        const tags = (c.tags || '').split(',').map(t => t.trim().toLowerCase());
        return tags.includes('target1');
      });
      return taggedContacts.filter(c => {
        const contactActivities = activities.filter(a => a.contact_id === c.id);
        if (contactActivities.length === 0) return true;
        const latest = contactActivities.reduce((max, a) =>
          (a.activity_date || '') > (max.activity_date || '') ? a : max
        );
        return (latest.activity_date || '') < sinceDate;
      });
    },
  },
  {
    id: 'target1_no_activity_2months',
    label: 'Contacts with tag Target1 with no activity since 2 months',
    group: 'Contacts',
    resultType: 'contacts',
    execute: (data) => {
      const sinceDate = getDaysAgo(60);
      const { contacts, activities } = data;
      const taggedContacts = contacts.filter(c => {
        const tags = (c.tags || '').split(',').map(t => t.trim().toLowerCase());
        return tags.includes('target1');
      });
      return taggedContacts.filter(c => {
        const contactActivities = activities.filter(a => a.contact_id === c.id);
        if (contactActivities.length === 0) return true;
        const latest = contactActivities.reduce((max, a) =>
          (a.activity_date || '') > (max.activity_date || '') ? a : max
        );
        return (latest.activity_date || '') < sinceDate;
      });
    },
  },
  {
    id: 'target1_no_activity_quarter',
    label: 'Contacts with tag Target1 with no activity this quarter',
    group: 'Contacts',
    resultType: 'contacts',
    execute: (data) => {
      const sinceDate = getStartOfQuarter();
      const { contacts, activities } = data;
      const taggedContacts = contacts.filter(c => {
        const tags = (c.tags || '').split(',').map(t => t.trim().toLowerCase());
        return tags.includes('target1');
      });
      return taggedContacts.filter(c => {
        const contactActivities = activities.filter(a => a.contact_id === c.id);
        if (contactActivities.length === 0) return true;
        const latest = contactActivities.reduce((max, a) =>
          (a.activity_date || '') > (max.activity_date || '') ? a : max
        );
        return (latest.activity_date || '') < sinceDate;
      });
    },
  },
  // Content
  {
    id: 'content_no_activity',
    label: 'Content with no activity',
    group: 'Content',
    resultType: 'content',
    execute: (data) => {
      const { content, activities } = data;
      const contentIdsWithActivity = new Set(
        activities.map(a => a.content_id).filter(id => id != null)
      );
      return content.filter(c => !contentIdsWithActivity.has(c.id));
    },
  },
];

// Group saved queries by group
const groupedSavedQueries = (() => {
  const groups = [];
  let currentGroup = null;
  savedQueries.forEach(q => {
    if (q.group !== currentGroup) {
      groups.push({ label: q.group, items: [] });
      currentGroup = q.group;
    }
    groups[groups.length - 1].items.push(q);
  });
  return groups;
})();

function FancyFilterPanel({ contacts, activities, content, onRun, onRunSaved, resultCount, lightMode }) {
  const [templateId, setTemplateId] = useState('');
  const [savedQueryId, setSavedQueryId] = useState('');
  const [params, setParams] = useState({});

  const template = templates.find(t => t.id === templateId);

  const handleTemplateChange = useCallback((e) => {
    const id = e.target.value;
    setTemplateId(id);
    setSavedQueryId(''); // Clear saved query selection
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

  const handleSavedQueryChange = useCallback((e) => {
    const id = e.target.value;
    setSavedQueryId(id);
    if (id) {
      setTemplateId(''); // Clear flex query selection
      setParams({});
      // Execute immediately
      const query = savedQueries.find(q => q.id === id);
      if (query && onRunSaved) {
        const data = { contacts, activities, content };
        const results = query.execute(data);
        onRunSaved(results, query.resultType);
      }
    }
  }, [contacts, activities, content, onRunSaved]);

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
        <option value="">Select a flex query...</option>
        {groupedTemplates.map(g => (
          <optgroup key={g.label} label={g.label}>
            {g.items.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </optgroup>
        ))}
      </select>

      <select
        className={selectClass}
        value={savedQueryId}
        onChange={handleSavedQueryChange}
      >
        <option value="">Select a saved query...</option>
        {groupedSavedQueries.map(g => (
          <optgroup key={g.label} label={g.label}>
            {g.items.map(q => (
              <option key={q.id} value={q.id}>{q.label}</option>
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
