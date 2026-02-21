import React, { useState, useMemo, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeBalham } from 'ag-grid-community';
import { CONTENT_TYPES, CONTENT_FIELDS, isPinnedRow, createEmptyRow } from './gridUtils';

const ContentTable = forwardRef(function ContentTable({ content, onUpdateContent, onCreateContent, onDelete, onNewActivity }, ref) {
  const gridRef = useRef(null);

  useImperativeHandle(ref, () => ({
    clearFilters: () => {
      const api = gridRef.current?.api;
      if (api) api.setFilterModel(null);
    },
  }));
  const [newRow, setNewRow] = useState(createEmptyRow(CONTENT_FIELDS));
  const newRowRef = useRef(newRow);
  newRowRef.current = newRow;
  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;
  const onNewActivityRef = useRef(onNewActivity);
  onNewActivityRef.current = onNewActivity;

  const containerRef = useRef(null);

  const columnDefs = useMemo(() => [
    { field: 'id', hide: true },
    {
      field: 'type',
      width: 110,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: CONTENT_TYPES },
    },
    { field: 'short_name', headerName: 'Short Name', width: 130, editable: true },
    { field: 'title', width: 200, editable: true },
    { field: 'author', width: 130, editable: true },
    { field: 'created_date', headerName: 'Created', width: 110, editable: false },
    { field: 'publish_date', headerName: 'Published', width: 120, editable: true },
    { field: 'link', width: 200, editable: true },
    { field: 'tags', width: 150, editable: true },
    { field: 'comment', width: 200, editable: true },
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
    const data = { ...row, publish_date: row.publish_date || null };
    onCreateContent(data);
    setNewRow(createEmptyRow(CONTENT_FIELDS));
  }, [onCreateContent]);

  const onCellValueChanged = useCallback((params) => {
    if (isPinnedRow(params)) {
      setNewRow(prev => ({ ...prev, [params.column.colId]: params.newValue }));
      return;
    }
    const { id, ...rest } = params.data;
    onUpdateContent(id, rest);
  }, [onUpdateContent]);

  const pinnedBottomRowData = useMemo(() => [newRow], [newRow]);

  const STORAGE_KEY = 'contentTable_columnState';

  const onGridReady = useCallback((params) => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        params.api.applyColumnState({ state: JSON.parse(saved), applyOrder: true });
      } catch (e) { /* ignore bad data */ }
    }
  }, []);

  const saveColumnState = useCallback((params) => {
    const state = params.api.getColumnState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, []);

  // Keyboard shortcuts: Alt+A to create activity for focused content row
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleKeyDown = (e) => {
      // Alt+U: open URL in focused cell
      if (e.altKey && e.key === 'u') {
        e.preventDefault();
        e.stopPropagation();
        const api = gridRef.current?.api;
        if (api) {
          const cell = api.getFocusedCell();
          if (cell && !cell.rowPinned) {
            const rowNode = api.getDisplayedRowAtIndex(cell.rowIndex);
            if (rowNode) {
              const colId = typeof cell.column.getColId === 'function' ? cell.column.getColId() : cell.column.colId;
              const val = rowNode.data[colId];
              if (typeof val === 'string' && val.trim()) {
                let url = val.trim();
                if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
                window.open(url, '_blank');
              }
            }
          }
        }
        return;
      }
      if (e.altKey && e.key === 'a') {
        e.preventDefault();
        const cell = gridRef.current?.api?.getFocusedCell();
        if (cell) {
          const rowNode = gridRef.current.api.getDisplayedRowAtIndex(cell.rowIndex);
          if (rowNode && !rowNode.rowPinned) {
            e.stopPropagation();
            onNewActivityRef.current(rowNode.data);
          }
        }
      }
    };
    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div ref={containerRef} className="ag-theme-balham" style={{ width: '100%', height: 'calc(100vh - 75px)' }} tabIndex={0}>
      <AgGridReact
        ref={gridRef}
        theme={themeBalham}
        rowData={content}
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

export default ContentTable;
