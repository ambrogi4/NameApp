import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeBalham } from 'ag-grid-community';
import { CONTACT_FIELDS, isPinnedRow, createEmptyRow } from './gridUtils';

export default function ContactTable({ contacts, onUpdateContact, onCreateContact, onPasteRows, onDeleteBatch, onNewActivity }) {
  const gridRef = useRef(null);
  const [newRow, setNewRow] = useState(createEmptyRow(CONTACT_FIELDS));
  const newRowRef = useRef(newRow);
  newRowRef.current = newRow;
  const onDeleteBatchRef = useRef(onDeleteBatch);
  onDeleteBatchRef.current = onDeleteBatch;
  const onNewActivityRef = useRef(onNewActivity);
  onNewActivityRef.current = onNewActivity;

  const [selectedRows, setSelectedRows] = useState([]);
  const [quickFilterText, setQuickFilterText] = useState('');

  const columnDefs = useMemo(() => [
    {
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 50,
      pinned: 'left',
      sortable: false,
      filter: false,
      editable: false,
      lockPosition: true,
    },
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

  // Paste handler — batch mode
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handlePaste = (e) => {
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
      const parsedRows = [];
      rows.forEach(row => {
        const cols = row.split('\t');
        const obj = {};
        cols.forEach((val, i) => {
          if (i < fields.length && val.trim() !== '') obj[fields[i]] = val.trim();
        });
        if (Object.keys(obj).length > 0) {
          parsedRows.push(obj);
        }
      });
      if (parsedRows.length > 0) {
        onPasteRowsRef.current(parsedRows);
      }
    };
    el.addEventListener('paste', handlePaste);
    return () => el.removeEventListener('paste', handlePaste);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'Delete' && selectedRows.length > 0) {
        e.preventDefault();
        onDeleteBatchRef.current(selectedRows);
        setSelectedRows([]);
        gridRef.current?.api?.deselectAll();
      }

      if (e.altKey && e.key === 'a') {
        e.preventDefault();
        const cell = gridRef.current?.api?.getFocusedCell();
        if (cell) {
          const rowNode = gridRef.current.api.getDisplayedRowAtIndex(cell.rowIndex);
          if (rowNode && !rowNode.rowPinned) {
            onNewActivityRef.current(rowNode.data);
          }
        }
      }
    };
    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [selectedRows]);

  const onSelectionChanged = useCallback(() => {
    const nodes = gridRef.current?.api?.getSelectedNodes() || [];
    const ids = nodes
      .filter(n => !n.rowPinned)
      .map(n => n.data.id)
      .filter(id => id != null);
    setSelectedRows(ids);
  }, []);

  const pinnedBottomRowData = useMemo(() => [newRow], [newRow]);

  const newRowHasData = newRow.first || newRow.last;

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
    <div>
      <div className="contact-toolbar">
        <input
          type="text"
          placeholder="Search contacts..."
          value={quickFilterText}
          onChange={(e) => setQuickFilterText(e.target.value)}
        />
        {newRowHasData && (
          <button onClick={handleSaveNew} style={{ backgroundColor: '#4CAF50', color: 'white' }}>
            Save New
          </button>
        )}
        {selectedRows.length > 0 && (
          <button
            className="delete-btn"
            onClick={() => {
              onDeleteBatchRef.current(selectedRows);
              setSelectedRows([]);
              gridRef.current?.api?.deselectAll();
            }}
          >
            Delete Selected ({selectedRows.length})
          </button>
        )}
        <span className="contact-count">{contacts.length} contacts</span>
      </div>
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
          rowSelection="multiple"
          suppressRowClickSelection={true}
          quickFilterText={quickFilterText}
          pagination={true}
          paginationPageSize={20}
          paginationPageSizeSelector={[20, 100]}
          onSelectionChanged={onSelectionChanged}
        />
      </div>
    </div>
  );
}
