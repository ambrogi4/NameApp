import React, { useState, useCallback, useRef } from 'react';
import { useGridFilter } from 'ag-grid-react';

const OPERATORS = [
  { value: 'contains', label: 'Contains' },
  { value: 'notContains', label: 'Does not contain' },
  { value: 'equals', label: 'Equals' },
  { value: 'notEqual', label: 'Does not equal' },
  { value: 'startsWith', label: 'Begins with' },
  { value: 'endsWith', label: 'Ends with' },
  { value: 'blank', label: 'Blank' },
  { value: 'notBlank', label: 'Not blank' },
];

const TAB_STYLE = (active) => ({
  cursor: 'pointer',
  padding: '3px 8px',
  fontSize: 11,
  borderBottom: active ? '2px solid #1976d2' : '2px solid transparent',
  color: active ? '#1976d2' : '#666',
  fontWeight: active ? 600 : 400,
});

export default function SetFilter({ model, onModelChange, api, getValue }) {
  const [tab, setTab] = useState((model && model.type === 'condition') ? 'condition' : 'values');
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);
  const condInputRef = useRef(null);

  // Collect unique values from all rows in this column
  const allValues = useCallback(() => {
    const vals = new Set();
    api.forEachNode((node) => {
      if (node.rowPinned) return;
      const v = getValue(node);
      if (v != null && String(v).trim() !== '') {
        vals.add(String(v).trim());
      }
    });
    return Array.from(vals).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [api, getValue]);

  const values = allValues();

  const doesFilterPass = useCallback((params) => {
    if (!model) return true;

    const v = getValue(params.node);
    const str = v != null ? String(v).trim() : '';

    if (model.type === 'condition') {
      const term = (model.term || '').toLowerCase();
      const lower = str.toLowerCase();
      switch (model.operator) {
        case 'contains': return lower.includes(term);
        case 'notContains': return !lower.includes(term);
        case 'equals': return lower === term;
        case 'notEqual': return lower !== term;
        case 'startsWith': return lower.startsWith(term);
        case 'endsWith': return lower.endsWith(term);
        case 'blank': return str === '';
        case 'notBlank': return str !== '';
        default: return true;
      }
    }

    // values mode
    return model.values.includes(str);
  }, [model, getValue]);

  const afterGuiAttached = useCallback(() => {
    if (tab === 'values') searchRef.current?.focus();
    else condInputRef.current?.focus();
  }, [tab]);

  useGridFilter({ doesFilterPass, afterGuiAttached });

  // --- Values tab logic ---
  const selected = (model && model.type !== 'condition') ? new Set(model.values) : null;
  const isValuesActive = model && model.type !== 'condition';

  const toggleValue = (val) => {
    if (!isValuesActive) {
      // No values filter active — select all except this one
      const newVals = values.filter(v => v !== val);
      onModelChange(newVals.length === 0 ? null : { values: newVals });
    } else if (selected.has(val)) {
      const newVals = model.values.filter(v => v !== val);
      onModelChange(newVals.length === 0 ? null : { values: newVals });
    } else {
      const newVals = [...model.values, val];
      if (newVals.length >= values.length) {
        onModelChange(null);
      } else {
        onModelChange({ values: newVals });
      }
    }
  };

  const selectAll = () => onModelChange(null);
  const selectNone = () => onModelChange({ values: [] });

  const filteredValues = search
    ? values.filter(v => v.toLowerCase().includes(search.toLowerCase()))
    : values;

  const hasBlanks = (() => {
    let found = false;
    api.forEachNode((node) => {
      if (node.rowPinned) return;
      const v = getValue(node);
      if (v == null || String(v).trim() === '') found = true;
    });
    return found;
  })();
  const blanksLabel = '(Blanks)';
  const blanksVisible = !search || blanksLabel.toLowerCase().includes(search.toLowerCase());
  const blanksChecked = !isValuesActive || selected.has('');

  const toggleBlanks = () => {
    if (!isValuesActive) {
      onModelChange({ values: values.slice() });
    } else if (selected.has('')) {
      const newVals = model.values.filter(v => v !== '');
      onModelChange(newVals.length === 0 ? null : { values: newVals });
    } else {
      const newVals = [...model.values, ''];
      onModelChange({ values: newVals });
    }
  };

  // --- Condition tab logic ---
  const condOperator = (model && model.type === 'condition') ? model.operator : 'contains';
  const condTerm = (model && model.type === 'condition') ? (model.term || '') : '';
  const needsTerm = (op) => op !== 'blank' && op !== 'notBlank';

  const setCondition = (operator, term) => {
    if (!needsTerm(operator)) {
      onModelChange({ type: 'condition', operator, term: '' });
    } else if (term) {
      onModelChange({ type: 'condition', operator, term });
    } else {
      onModelChange(null);
    }
  };

  const handleTabSwitch = (newTab) => {
    setTab(newTab);
    // Clear the other mode's filter when switching
    if (model) onModelChange(null);
  };

  const inputStyle = { width: '100%', padding: '3px 6px', fontSize: 12, boxSizing: 'border-box' };

  return (
    <div style={{ padding: 6, width: 210, maxHeight: 320, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 0, marginBottom: 6, borderBottom: '1px solid #ddd' }}>
        <span style={TAB_STYLE(tab === 'values')} onClick={() => handleTabSwitch('values')}>Values</span>
        <span style={TAB_STYLE(tab === 'condition')} onClick={() => handleTabSwitch('condition')}>Condition</span>
      </div>

      {tab === 'values' && (
        <>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, marginBottom: 4 }}
          />
          <div style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 11 }}>
            <span onClick={selectAll} style={{ cursor: 'pointer', color: '#1976d2' }}>All</span>
            <span onClick={selectNone} style={{ cursor: 'pointer', color: '#1976d2' }}>None</span>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredValues.map(val => (
              <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '1px 0', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!isValuesActive || selected.has(val)}
                  onChange={() => toggleValue(val)}
                  style={{ margin: 0 }}
                />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</span>
              </label>
            ))}
            {hasBlanks && blanksVisible && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '1px 0', cursor: 'pointer', fontStyle: 'italic', color: '#888' }}>
                <input
                  type="checkbox"
                  checked={blanksChecked}
                  onChange={toggleBlanks}
                  style={{ margin: 0 }}
                />
                <span>{blanksLabel}</span>
              </label>
            )}
          </div>
        </>
      )}

      {tab === 'condition' && (
        <>
          <select
            value={condOperator}
            onChange={(e) => setCondition(e.target.value, condTerm)}
            style={{ ...inputStyle, marginBottom: 4 }}
          >
            {OPERATORS.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
          {needsTerm(condOperator) && (
            <input
              ref={condInputRef}
              type="text"
              placeholder="Filter value..."
              value={condTerm}
              onChange={(e) => setCondition(condOperator, e.target.value)}
              style={inputStyle}
            />
          )}
        </>
      )}
    </div>
  );
}
