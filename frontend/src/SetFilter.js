import React, { useState, useCallback, useRef } from 'react';
import { useGridFilter } from 'ag-grid-react';

// ── Data type detection ───────────────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}/;

function detectDataType(rawVals) {
  const sample = rawVals.filter(v => v != null && String(v).trim() !== '').slice(0, 40);
  if (sample.length === 0) return 'text';
  if (sample.every(v => typeof v === 'boolean')) return 'boolean';
  if (sample.every(v => !isNaN(Number(v)) && String(v).trim() !== '')) return 'number';
  if (sample.every(v => DATE_RE.test(String(v).trim()))) return 'date';
  return 'text';
}

// ── Operator tables ───────────────────────────────────────────────────────────

const OPERATORS = {
  text: [
    { value: '', label: 'None' },
    { value: 'contains', label: 'Contains' },
    { value: 'notContains', label: 'Does not contain' },
    { value: 'equals', label: 'Text is exactly' },
    { value: 'notEqual', label: 'Text is not' },
    { value: 'startsWith', label: 'Starts with' },
    { value: 'endsWith', label: 'Ends with' },
    { value: 'blank', label: 'Is empty' },
    { value: 'notBlank', label: 'Is not empty' },
  ],
  number: [
    { value: '', label: 'None' },
    { value: 'eq', label: '= (equals)' },
    { value: 'neq', label: '≠ (does not equal)' },
    { value: 'gt', label: '> (greater than)' },
    { value: 'gte', label: '≥ (greater than or equal)' },
    { value: 'lt', label: '< (less than)' },
    { value: 'lte', label: '≤ (less than or equal)' },
    { value: 'between', label: 'Is between' },
    { value: 'notBetween', label: 'Is not between' },
    { value: 'blank', label: 'Is empty' },
    { value: 'notBlank', label: 'Is not empty' },
  ],
  date: [
    { value: '', label: 'None' },
    { value: 'dateIs', label: 'Date is' },
    { value: 'dateBefore', label: 'Date is before' },
    { value: 'dateAfter', label: 'Date is after' },
    { value: 'dateOnOrBefore', label: 'Date is on or before' },
    { value: 'dateOnOrAfter', label: 'Date is on or after' },
    { value: 'dateBetween', label: 'Is between' },
    { value: 'dateNotBetween', label: 'Is not between' },
    { value: 'blank', label: 'Is empty' },
    { value: 'notBlank', label: 'Is not empty' },
  ],
  boolean: [
    { value: '', label: 'None' },
    { value: 'isTrue', label: 'Is checked' },
    { value: 'isFalse', label: 'Is not checked' },
  ],
};

const NEEDS_ONE = new Set([
  'contains', 'notContains', 'equals', 'notEqual', 'startsWith', 'endsWith',
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
  'dateIs', 'dateBefore', 'dateAfter', 'dateOnOrBefore', 'dateOnOrAfter',
]);
const NEEDS_TWO = new Set(['between', 'notBetween', 'dateBetween', 'dateNotBetween']);
const IS_DATE_OP = new Set([
  'dateIs', 'dateBefore', 'dateAfter', 'dateOnOrBefore', 'dateOnOrAfter',
  'dateBetween', 'dateNotBetween',
]);

// ── Model migration (old tab-based format → new unified format) ───────────────

function migrateModel(model) {
  if (!model) return null;
  if ('condition' in model) return model; // already new shape
  if (Array.isArray(model.values)) return { condition: null, values: model.values };
  if (model.type === 'condition') {
    return { condition: { operator: model.operator, term: model.term || '', term2: '' }, values: null };
  }
  return null;
}

// ── Filter pass logic (pure function, used in doesFilterPass) ─────────────────

function passesCondition(raw, condition) {
  if (!condition || !condition.operator) return true;
  const { operator, term, term2 } = condition;
  const str = raw != null ? String(raw).trim() : '';

  if (operator === 'blank') return str === '';
  if (operator === 'notBlank') return str !== '';
  if (operator === 'isTrue') return raw === true || str === 'true';
  if (operator === 'isFalse') return raw === false || str === 'false';

  const lower = str.toLowerCase();
  const t1 = (term || '').toLowerCase();
  if (operator === 'contains') return lower.includes(t1);
  if (operator === 'notContains') return !lower.includes(t1);
  if (operator === 'equals') return lower === t1;
  if (operator === 'notEqual') return lower !== t1;
  if (operator === 'startsWith') return lower.startsWith(t1);
  if (operator === 'endsWith') return lower.endsWith(t1);

  const num = parseFloat(str);
  const n1 = parseFloat(term || '');
  const n2 = parseFloat(term2 || '');
  if (operator === 'eq') return !isNaN(num) && num === n1;
  if (operator === 'neq') return !isNaN(num) && num !== n1;
  if (operator === 'gt') return !isNaN(num) && num > n1;
  if (operator === 'gte') return !isNaN(num) && num >= n1;
  if (operator === 'lt') return !isNaN(num) && num < n1;
  if (operator === 'lte') return !isNaN(num) && num <= n1;
  if (operator === 'between') return !isNaN(num) && !isNaN(n1) && !isNaN(n2) && num >= n1 && num <= n2;
  if (operator === 'notBetween') return !isNaN(num) && !isNaN(n1) && !isNaN(n2) && (num < n1 || num > n2);

  const d = str ? new Date(str.slice(0, 10)) : null;
  const d1 = term ? new Date(term) : null;
  const d2 = term2 ? new Date(term2) : null;
  const dOk = d && !isNaN(d);
  if (operator === 'dateIs') return dOk && d1 && d.getTime() === d1.getTime();
  if (operator === 'dateBefore') return dOk && d1 && d < d1;
  if (operator === 'dateAfter') return dOk && d1 && d > d1;
  if (operator === 'dateOnOrBefore') return dOk && d1 && d <= d1;
  if (operator === 'dateOnOrAfter') return dOk && d1 && d >= d1;
  if (operator === 'dateBetween') return dOk && d1 && d2 && d >= d1 && d <= d2;
  if (operator === 'dateNotBetween') return dOk && d1 && d2 && (d < d1 || d > d2);

  return true;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SetFilter({ model: rawModel, onModelChange, api, getValue }) {
  const model = migrateModel(rawModel);
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);

  // Collect raw values from all rows (runs each render; panel is short-lived)
  const rawValues = [];
  api.forEachNode((node) => {
    if (node.rowPinned) return;
    rawValues.push(getValue(node));
  });

  const dataType = detectDataType(rawValues);

  const strValues = Array.from(
    new Set(rawValues.filter(v => v != null && String(v).trim() !== '').map(v => String(v).trim()))
  ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const hasBlanks = rawValues.some(v => v == null || String(v).trim() === '');

  // ── Filter logic ────────────────────────────────────────────────────────────

  const doesFilterPass = useCallback((params) => {
    if (!model) return true;
    const raw = getValue(params.node);
    const str = raw != null ? String(raw).trim() : '';
    if (model.condition && !passesCondition(raw, model.condition)) return false;
    if (model.values !== null && model.values !== undefined) {
      if (!model.values.includes(str)) return false;
    }
    return true;
  }, [model, getValue]);

  const afterGuiAttached = useCallback(() => {
    searchRef.current?.focus();
  }, []);

  useGridFilter({ doesFilterPass, afterGuiAttached });

  // ── Model emit helpers ──────────────────────────────────────────────────────

  const emitModel = (condition, values) => {
    const cond = condition?.operator ? condition : null;
    const vals = values ?? null;
    onModelChange(cond === null && vals === null ? null : { condition: cond, values: vals });
  };

  // Condition state derived from model
  const condOp = model?.condition?.operator || '';
  const condTerm = model?.condition?.term || '';
  const condTerm2 = model?.condition?.term2 || '';

  const handleOpChange = (op) => {
    emitModel(
      op ? { operator: op, term: condTerm, term2: condTerm2 } : null,
      model?.values ?? null
    );
  };
  const handleTermChange = (t) => {
    emitModel({ operator: condOp, term: t, term2: condTerm2 }, model?.values ?? null);
  };
  const handleTerm2Change = (t) => {
    emitModel({ operator: condOp, term: condTerm, term2: t }, model?.values ?? null);
  };

  // ── Values section helpers ──────────────────────────────────────────────────

  const isValuesActive = model?.values != null;
  const selected = isValuesActive ? new Set(model.values) : null;

  const filteredValues = search
    ? strValues.filter(v => v.toLowerCase().includes(search.toLowerCase()))
    : strValues;

  const blanksLabel = '(Blanks)';
  const blanksVisible = !search || blanksLabel.toLowerCase().includes(search.toLowerCase());
  const blanksChecked = !isValuesActive || selected.has('');

  const selectAll = () => emitModel(model?.condition ?? null, null);
  const selectNone = () => emitModel(model?.condition ?? null, []);

  const toggleValue = (val) => {
    if (!isValuesActive) {
      const newVals = strValues.filter(v => v !== val);
      emitModel(model?.condition ?? null, newVals.length === 0 ? null : newVals);
    } else if (selected.has(val)) {
      const newVals = model.values.filter(v => v !== val);
      emitModel(model?.condition ?? null, newVals.length === 0 ? null : newVals);
    } else {
      const newVals = [...model.values, val];
      const allSelected = newVals.length >= strValues.length && !hasBlanks;
      emitModel(model?.condition ?? null, allSelected ? null : newVals);
    }
  };

  const toggleBlanks = () => {
    if (!isValuesActive) {
      emitModel(model?.condition ?? null, strValues.slice());
    } else if (selected.has('')) {
      const newVals = model.values.filter(v => v !== '');
      emitModel(model?.condition ?? null, newVals.length === 0 ? null : newVals);
    } else {
      emitModel(model?.condition ?? null, [...model.values, '']);
    }
  };

  // ── Render helpers ──────────────────────────────────────────────────────────

  const displayVal = (v) => {
    if (dataType === 'boolean') return v === 'true' ? 'Yes' : v === 'false' ? 'No' : v;
    return v;
  };

  const operators = OPERATORS[dataType] || OPERATORS.text;
  const needsOne = NEEDS_ONE.has(condOp);
  const needsTwo = NEEDS_TWO.has(condOp);
  const inputType = IS_DATE_OP.has(condOp) ? 'date' : 'text';

  const inp = { width: '100%', padding: '3px 6px', fontSize: 12, boxSizing: 'border-box', marginBottom: 3 };
  const sectionLabel = { fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 };

  return (
    <div style={{ padding: 6, width: 230, maxHeight: 480, display: 'flex', flexDirection: 'column' }}>

      {/* ── Condition section ── */}
      <div style={sectionLabel}>Condition</div>
      <select
        value={condOp}
        onChange={(e) => handleOpChange(e.target.value)}
        style={inp}
      >
        {operators.map(op => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>
      {(needsOne || needsTwo) && (
        <input
          type={inputType}
          placeholder={needsTwo ? 'From...' : 'Value...'}
          value={condTerm}
          onChange={(e) => handleTermChange(e.target.value)}
          style={inp}
        />
      )}
      {needsTwo && (
        <input
          type={inputType}
          placeholder="To..."
          value={condTerm2}
          onChange={(e) => handleTerm2Change(e.target.value)}
          style={inp}
        />
      )}

      {/* ── Separator ── */}
      <div style={{ borderTop: '2px solid #555', margin: '6px 0' }} />

      {/* ── Values section ── */}
      <div style={sectionLabel}>Values</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 5 }}>
        <span onClick={selectAll} style={{ cursor: 'pointer', color: '#1976d2', fontSize: 11 }}>All</span>
        <span onClick={selectNone} style={{ cursor: 'pointer', color: '#1976d2', fontSize: 11 }}>None</span>
      </div>
      <input
        ref={searchRef}
        type="text"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ ...inp, marginBottom: 4 }}
      />
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {filteredValues.map(val => (
          <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '1px 0', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!isValuesActive || selected.has(val)}
              onChange={() => toggleValue(val)}
              style={{ margin: 0 }}
            />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayVal(val)}</span>
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

    </div>
  );
}
