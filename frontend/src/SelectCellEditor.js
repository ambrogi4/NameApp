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

  return (
    <select
      ref={ref}
      value={val ?? ''}
      onChange={handleChange}
      style={{ width: '100%', height: '100%', border: 'none' }}
    >
      {allowNull && <option value="">-- none --</option>}
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
