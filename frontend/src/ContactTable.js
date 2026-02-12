import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeBalham } from 'ag-grid-community';
import { CONTACT_FIELDS, isPinnedRow, createEmptyRow } from './gridUtils';

export default function ContactTable({ contacts, onUpdateContact, onCreateContact, onPasteRows, onDelete, onNewActivity }) {
  const gridRef = useRef(null);
  const [newRow, setNewRow] = useState(createEmptyRow(CONTACT_FIELDS));
  const newRowRef = useRef(newRow);
  newRowRef.current = newRow;
  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;
  const onNewActivityRef = useRef(onNewActivity);
  onNewActivityRef.current = onNewActivity;

  const columnDefs = useMemo(() => [
    { field: 'id', hide: true },
    {
      headerName: 'Name',
      children: [
        { field: 'first', width: 100, editable: true },
        { field: 'last', width: 100, editable: true },
        { field: 'title', width: 120, editable: true, columnGroupShow: 'open' },
        { field: 'firm', width: 120, editable: true, columnGroupShow: 'open' },
      ],
    },
    {
      headerName: 'Contact Info',
      children: [
        { field: 'email', width: 160, editable: true },
        { field: 'phone', width: 120, editable: true, columnGroupShow: 'open' },
        { field: 'li_url', headerName: 'LinkedIn', width: 160, editable: true, columnGroupShow: 'open' },
      ],
    },
    {
      headerName: 'Address',
      children: [
        { field: 'city', width: 100, editable: true },
        { field: 'state', width: 70, editable: true },
        { field: 'street', width: 140, editable: true, columnGroupShow: 'open' },
        { field: 'zip', width: 70, editable: true, columnGroupShow: 'open' },
        { field: 'country', width: 80, editable: true, columnGroupShow: 'open' },
      ],
    },
    {
      headerName: 'Details',
      children: [
        { field: 'source', width: 100, editable: true },
        { field: 'tags', width: 120, editable: true },
        { field: 'education', width: 120, editable: true, columnGroupShow: 'open' },
        { field: 'comment', width: 160, editable: true, columnGroupShow: 'open' },
        { field: 'photo_url', headerName: 'Photo URL', width: 140, editable: true, columnGroupShow: 'open' },
      ],
    },
    {
      headerName: 'Flags',
      children: [
        {
          field: 'in_crm',
          headerName: 'CRM',
          width: 60,
          editable: true,
          cellDataType: 'boolean',
        },
        {
          field: 'index_1',
          headerName: 'Idx 1',
          width: 70,
          editable: true,
          filter: 'agNumberColumnFilter',
          columnGroupShow: 'open',
          valueParser: (params) => params.newValue === '' || params.newValue == null ? null : Number(params.newValue),
        },
        {
          field: 'index_2',
          headerName: 'Idx 2',
          width: 70,
          editable: true,
          filter: 'agNumberColumnFilter',
          columnGroupShow: 'open',
          valueParser: (params) => params.newValue === '' || params.newValue == null ? null : Number(params.newValue),
        },
        { field: 'created_date', headerName: 'Created', width: 110, editable: false, filter: 'agDateColumnFilter', columnGroupShow: 'open' },
      ],
    },
    {
      headerName: 'Actions',
      pinned: 'right',
      width: 180,
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
          <>
            <button className="delete-btn" onClick={() => onDeleteRef.current(params.data.id)} style={{ fontSize: 11, padding: '2px 6px' }}>
              Del
            </button>
            <button className="activity-btn" onClick={() => onNewActivityRef.current(params.data)} style={{ fontSize: 11, padding: '2px 6px', marginLeft: 2 }}>
              + Activity
            </button>
          </>
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
    const data = { ...newRowRef.current };
    data.index_1 = data.index_1 === '' ? null : data.index_1;
    data.index_2 = data.index_2 === '' ? null : data.index_2;
    onCreateContact(data);
    setNewRow(createEmptyRow(CONTACT_FIELDS));
  }, [onCreateContact]);

  const onCellValueChanged = useCallback((params) => {
    if (isPinnedRow(params)) {
      setNewRow(prev => ({ ...prev, [params.column.colId]: params.newValue }));
      return;
    }
    const { id, ...rest } = params.data;
    onUpdateContact(id, rest);
  }, [onUpdateContact]);

  const containerRef = useRef(null);
  const onPasteRowsRef = useRef(onPasteRows);
  onPasteRowsRef.current = onPasteRows;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handlePaste = (e) => {
      // Skip if user is editing inside an input/textarea
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const text = e.clipboardData?.getData('text/plain');
      if (!text) return;

      const fields = ['first', 'last', 'title', 'firm', 'source', 'education',
        'email', 'phone', 'street', 'city', 'state', 'zip', 'country',
        'li_url', 'photo_url', 'tags', 'comment'];
      const rows = text.split('\n').filter(line => line.trim() !== '');
      if (rows.length === 0) return;

      e.preventDefault();
      rows.forEach(row => {
        const cols = row.split('\t');
        const obj = {};
        cols.forEach((val, i) => {
          if (i < fields.length && val.trim() !== '') obj[fields[i]] = val.trim();
        });
        if (Object.keys(obj).length > 0) {
          onPasteRowsRef.current(obj);
        }
      });
    };
    el.addEventListener('paste', handlePaste);
    return () => el.removeEventListener('paste', handlePaste);
  }, []);

  const pinnedBottomRowData = useMemo(() => [newRow], [newRow]);

  const GROUP_KEY = 'contactTable_columnGroupState';
  const COL_KEY = 'contactTable_columnState';

  const onGridReady = useCallback((params) => {
    const savedGroup = localStorage.getItem(GROUP_KEY);
    if (savedGroup) {
      try { params.api.setColumnGroupState(JSON.parse(savedGroup)); } catch (e) { /* ignore */ }
    }
    const savedCol = localStorage.getItem(COL_KEY);
    if (savedCol) {
      try { params.api.applyColumnState({ state: JSON.parse(savedCol), applyOrder: true }); } catch (e) { /* ignore */ }
    }
  }, []);

  const onColumnGroupOpened = useCallback((params) => {
    localStorage.setItem(GROUP_KEY, JSON.stringify(params.api.getColumnGroupState()));
  }, []);

  const saveColumnState = useCallback((params) => {
    localStorage.setItem(COL_KEY, JSON.stringify(params.api.getColumnState()));
  }, []);

  return (
    <div ref={containerRef} className="ag-theme-balham" style={{ width: '100%', height: 500 }} tabIndex={0}>
      <AgGridReact
        ref={gridRef}
        theme={themeBalham}
        rowData={contacts}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        pinnedBottomRowData={pinnedBottomRowData}
        onCellValueChanged={onCellValueChanged}
        onGridReady={onGridReady}
        onColumnGroupOpened={onColumnGroupOpened}
        onSortChanged={saveColumnState}
        onColumnResized={saveColumnState}
        onColumnMoved={saveColumnState}
        onFilterChanged={saveColumnState}
        getRowId={(params) => params.data.id != null ? String(params.data.id) : 'new'}
        stopEditingWhenCellsLoseFocus={true}
      />
    </div>
  );
}
