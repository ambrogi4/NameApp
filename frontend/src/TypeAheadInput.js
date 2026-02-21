import React, { useState, useRef, useEffect, useCallback } from 'react';

function TypeAheadInput({ options, value, onChange, placeholder, lightMode }) {
  const [inputText, setInputText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  // Find label for current value
  const selectedLabel = value ? (options.find(o => String(o.value) === String(value))?.label || '') : '';

  const filtered = inputText
    ? options.filter(o => o.label.toLowerCase().includes(inputText.toLowerCase()))
    : options;

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    setIsOpen(true);
    setHighlightIndex(-1);
    // Clear selected value when user types
    if (value) onChange('');
  };

  const handleSelect = useCallback((option) => {
    onChange(String(option.value));
    setInputText('');
    setIsOpen(false);
    setHighlightIndex(-1);
  }, [onChange]);

  const handleKeyDown = (e) => {
    if (!isOpen && e.key === 'ArrowDown') {
      setIsOpen(true);
      setHighlightIndex(0);
      e.preventDefault();
      return;
    }
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < filtered.length) {
        handleSelect(filtered[highlightIndex]);
      }
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setIsOpen(false);
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[highlightIndex]) {
        items[highlightIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const cls = (base) => lightMode ? `${base}-light` : base;

  return (
    <div ref={containerRef} className="typeahead-container">
      <input
        type="text"
        className={cls('typeahead-input')}
        value={value ? selectedLabel : inputText}
        onChange={handleInputChange}
        onFocus={() => { if (!value) setIsOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      {value && (
        <button
          className={cls('typeahead-clear')}
          onClick={() => { onChange(''); setInputText(''); }}
          tabIndex={-1}
        >
          &times;
        </button>
      )}
      {isOpen && filtered.length > 0 && (
        <ul ref={listRef} className={cls('typeahead-list')}>
          {filtered.slice(0, 50).map((opt, i) => (
            <li
              key={opt.value}
              className={i === highlightIndex ? `${cls('typeahead-item')} ${cls('typeahead-highlighted')}` : cls('typeahead-item')}
              onMouseDown={() => handleSelect(opt)}
              onMouseEnter={() => setHighlightIndex(i)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TypeAheadInput;
