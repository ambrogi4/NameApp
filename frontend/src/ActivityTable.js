import React, { useState, useMemo, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeBalham } from 'ag-grid-community';
import { CHANNELS, ACTIVITY_FIELDS, isPinnedRow, createEmptyRow } from './gridUtils';
import SelectCellEditor from './SelectCellEditor';

const ActivityTable = forwardRef(function ActivityTable({ activities, contacts, content, onUpdateActivity, onCreateActivity, onDelete, prefillContactId, onClearPrefill, lookupMode, onDismiss }, ref) {
  const gridRef = useRef(null);

  useImperativeHandle(ref, () => ({
    clearFilters: () => {
      const api = gridRef.current?.api;
      if (api) api.setFilterModel(null);
    },
  }));
  const [newRow, setNewRow] = useState(createEmptyRow(ACTIVITY_FIELDS));
  const newRowRef = useRef(newRow);
  newRowRef.current = newRow;
  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;

  const containerRef = useRef(null);

  const focusPinnedContact = useCallback(() => {
    setTimeout(() => {
      const api = gridRef.current?.api;
      if (!api) return;
      const pinnedRowCount = api.getPinnedBottomRowCount();
      if (pinnedRowCount > 0) {
        api.setFocusedCell(0, 'contact_id', 'bottom');
      }
    }, 100);
  }, []);

  useEffect(() => {
    if (prefillContactId) {
      setNewRow(prev => ({ ...prev, contact_id: prefillContactId }));
      focusPinnedContact();
    }
  }, [prefillContactId, focusPinnedContact]);

  // Keyboard shortcuts: Ctrl+Enter to save, Alt+A to copy contact from focused row
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleKeyDown = (e) => {
      // Ctrl+Enter: save new row
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        const row = newRowRef.current;
        if (row.contact_id) {
          handleSaveNewRef.current();
        }
        return;
      }

      // Alt+Enter: jump to pinned new row
      if (e.altKey && e.key === 'Enter') {
        e.preventDefault();
        focusPinnedContact();
        return;
      }

      // Alt+A: copy contact_id from focused row into new row
      if (e.altKey && e.key === 'a') {
        e.preventDefault();
        const api = gridRef.current?.api;
        if (!api) return;
        const cell = api.getFocusedCell();
        if (cell && cell.rowPinned !== 'bottom') {
          const rowNode = api.getDisplayedRowAtIndex(cell.rowIndex);
          if (rowNode?.data?.contact_id) {
            setNewRow(prev => ({ ...prev, contact_id: rowNode.data.contact_id }));
            focusPinnedContact();
          }
        }
        return;
      }
    };
    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [focusPinnedContact]);

  const handleSaveNewRef = useRef(null);

  const contactOptions = useMemo(() =>
    contacts.map(c => ({ value: c.id, label: `${c.first} ${c.last}` })),
    [contacts]
  );

  const contentOptions = useMemo(() =>
    content.map(c => ({ value: c.id, label: c.short_name || c.title || `#${c.id}` })),
    [content]
  );

  const contactNameRef = useRef((id) => '');
  contactNameRef.current = (id) => {
    const c = contacts.find(c => c.id === id);
    return c ? `${c.first} ${c.last}` : id ? `#${id}` : '';
  };

  const contentNameRef = useRef((id) => '');
  contentNameRef.current = (id) => {
    const c = content.find(c => c.id === id);
    return c ? (c.short_name || c.title || `#${c.id}`) : '';
  };

  const contactOptionsRef = useRef(contactOptions);
  contactOptionsRef.current = contactOptions;
  const contentOptionsRef = useRef(contentOptions);
  contentOptionsRef.current = contentOptions;

  const columnDefs = useMemo(() => [
    { field: 'id', hide: true },
    {
      field: 'contact_id',
      headerName: 'Contact',
      width: 150,
      editable: true,
      valueFormatter: (params) => contactNameRef.current(params.value),
      cellEditor: SelectCellEditor,
      cellEditorParams: () => ({ options: contactOptionsRef.current, numeric: true, allowNull: false }),
    },
    {
      field: 'content_id',
      headerName: 'Content',
      width: 140,
      editable: true,
      valueFormatter: (params) => contentNameRef.current(params.value),
      cellEditor: SelectCellEditor,
      cellEditorParams: () => ({ options: contentOptionsRef.current, numeric: true, allowNull: true }),
    },
    {
      field: 'channel',
      width: 110,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: CHANNELS },
    },
    { field: 'activity_date', headerName: 'Date', width: 110, editable: true },
    { field: 'topic', width: 180, editable: true },
    { field: 'comment', width: 180, editable: true },
    {
      field: 'contact_responded',
      headerName: 'Responded',
      width: 90,
      editable: true,
      cellDataType: 'boolean',
    },
    {
      field: 'email_opened',
      headerName: 'Opened',
      width: 80,
      editable: true,
      cellDataType: 'boolean',
    },
    {
      field: 'in_crm',
      headerName: 'CRM',
      width: 60,
      editable: true,
      cellDataType: 'boolean',
    },
    {
      headerName: 'Actions',
      pinned: 'right',
      width: 100,
      sortable: false,
      filter: false,
      editable: false,
      cellRenderer: (params) => {
        if (isPinnedRow(params)) {
          return (
            <button onClick={() => handleSaveNew()} style={{ fontSize: 12, padding: '2px 8px' }}>
              Save
            </button>
          );
        }
        return (
          <button className="delete-btn" onClick={() => onDeleteRef.current(params.data.id)} style={{ fontSize: 12, padding: '2px 8px' }}>
            Delete
          </button>
        );
      },
    },
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: 'agTextColumnFilter',
    resizable: true,
  }), []);

  const handleSaveNew = useCallback(() => {
    const row = newRowRef.current;
    const data = {
      ...row,
      contact_id: row.contact_id ? Number(row.contact_id) : null,
      content_id: row.content_id ? Number(row.content_id) : null,
      activity_date: row.activity_date || null,
    };
    onCreateActivity(data);
    setNewRow(createEmptyRow(ACTIVITY_FIELDS));
    if (onClearPrefill) onClearPrefill();
  }, [onCreateActivity, onClearPrefill]);
  handleSaveNewRef.current = handleSaveNew;

  const onCellValueChanged = useCallback((params) => {
    if (isPinnedRow(params)) {
      setNewRow(prev => ({ ...prev, [params.column.colId]: params.newValue }));
      return;
    }
    const { id, ...rest } = params.data;
    onUpdateActivity(id, rest);
  }, [onUpdateActivity]);

  const pinnedBottomRowData = useMemo(() => lookupMode ? undefined : [newRow], [newRow, lookupMode]);

  const STORAGE_KEY = 'activityTable_columnState';

  const onGridReady = useCallback((params) => {
    if (lookupMode) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        params.api.applyColumnState({ state: JSON.parse(saved), applyOrder: true });
      } catch (e) { /* ignore bad data */ }
    }
  }, [lookupMode]);

  const saveColumnState = useCallback((params) => {
    if (lookupMode) return;
    const state = params.api.getColumnState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [lookupMode]);

  return (
    <div ref={containerRef} className="ag-theme-balham" style={{ width: '100%', height: 'calc(100vh - 42px)' }} tabIndex={0}>
      <AgGridReact
        ref={gridRef}
        theme={themeBalham}
        rowData={activities}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        pinnedBottomRowData={pinnedBottomRowData}
        onCellValueChanged={onCellValueChanged}
        onGridReady={onGridReady}
        onSortChanged={saveColumnState}
        onColumnResized={saveColumnState}
        onColumnMoved={saveColumnState}
        onFilterChanged={saveColumnState}
        getRowId={(params) => params.data.id != null ? String(params.data.id) : 'new'}
        stopEditingWhenCellsLoseFocus={true}
      />
    </div>
  );
});

export default ActivityTable;
