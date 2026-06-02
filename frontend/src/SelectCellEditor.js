import React, { useState, useRef, useEffect } from 'react';

export default function SelectCellEditor({ value, onValueChange, options, numeric, allowNull }) {
  const [val, setVal] = useState(value ?? '');
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const handleChange = (e) => {
    let v = e.target.value;
    if (v === '' && allowNull) {
      v = null;
    } else if (numeric) {
      v = Number(v);
    }
    setVal(v);
    onValueChange(v);
  };

  // Letter-key selection: pressing a letter selects the first option starting with that letter
  const handleKeyDown = (e) => {
    const key = e.key.toLowerCase();
    if (key.length === 1 && /[a-z]/.test(key)) {
      const match = options.find(o =>
        (o.label || o.value).toString().toLowerCase().startsWith(key)
      );
      if (match) {
        e.preventDefault();
        let v = match.value;
        if (numeric) v = Number(v);
        setVal(v);
        onValueChange(v);
      }
    }
  };

  return (
    <select
      ref={ref}
      value={val ?? ''}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      style={{ width: '100%', height: '100%', border: 'none' }}
    >
      {allowNull && <option value="">-- none --</option>}
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
