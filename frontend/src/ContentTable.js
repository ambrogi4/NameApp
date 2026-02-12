import React, { useState, useMemo, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeBalham } from 'ag-grid-community';
import { CONTENT_TYPES, CONTENT_FIELDS, isPinnedRow, createEmptyRow } from './gridUtils';

export default function ContentTable({ content, onUpdateContent, onCreateContent, onDelete }) {
  const gridRef = useRef(null);
  const [newRow, setNewRow] = useState(createEmptyRow(CONTENT_FIELDS));
  const newRowRef = useRef(newRow);
  newRowRef.current = newRow;
  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;

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

  return (
    <div className="ag-theme-balham" style={{ width: '100%', height: 500 }}>
      <AgGridReact
        ref={gridRef}
        theme={themeBalham}
        rowData={content}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        pinnedBottomRowData={pinnedBottomRowData}
        onCellValueChanged={onCellValueChanged}
        getRowId={(params) => params.data.id != null ? String(params.data.id) : 'new'}
        stopEditingWhenCellsLoseFocus={true}
      />
    </div>
  );
}
