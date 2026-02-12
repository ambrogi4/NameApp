import React, { useState, useMemo, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeBalham } from 'ag-grid-community';
import { CONTACT_FIELDS, isPinnedRow, createEmptyRow } from './gridUtils';

export default function ContactTable({ contacts, onUpdateContact, onCreateContact, onPasteRows, onDelete, onNewActivity }) {
  const gridRef = useRef(null);
  const [newRow, setNewRow] = useState(createEmptyRow(CONTACT_FIELDS));

  const columnDefs = useMemo(() => [
    { field: 'id', hide: true },
    { field: 'first', width: 100, editable: true },
    { field: 'last', width: 100, editable: true },
    { field: 'title', width: 120, editable: true },
    { field: 'firm', width: 120, editable: true },
    { field: 'source', width: 100, editable: true },
    { field: 'education', width: 120, editable: true },
    { field: 'email', width: 160, editable: true },
    { field: 'phone', width: 120, editable: true },
    { field: 'street', width: 140, editable: true },
    { field: 'city', width: 100, editable: true },
    { field: 'state', width: 70, editable: true },
    { field: 'zip', width: 70, editable: true },
    { field: 'country', width: 80, editable: true },
    { field: 'li_url', headerName: 'LinkedIn', width: 160, editable: true },
    { field: 'photo_url', headerName: 'Photo URL', width: 140, editable: true },
    { field: 'tags', width: 120, editable: true },
    { field: 'comment', width: 160, editable: true },
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
      valueParser: (params) => params.newValue === '' || params.newValue == null ? null : Number(params.newValue),
    },
    {
      field: 'index_2',
      headerName: 'Idx 2',
      width: 70,
      editable: true,
      filter: 'agNumberColumnFilter',
      valueParser: (params) => params.newValue === '' || params.newValue == null ? null : Number(params.newValue),
    },
    { field: 'created_date', headerName: 'Created', width: 110, editable: false, filter: 'agDateColumnFilter' },
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
            <button className="delete-btn" onClick={() => onDelete(params.data.id)} style={{ fontSize: 11, padding: '2px 6px' }}>
              Del
            </button>
            <button className="activity-btn" onClick={() => onNewActivity(params.data)} style={{ fontSize: 11, padding: '2px 6px', marginLeft: 2 }}>
              + Activity
            </button>
          </>
        );
      },
    },
  ], [onDelete, onNewActivity]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: 'agTextColumnFilter',
    resizable: true,
  }), []);

  const handleSaveNew = useCallback(() => {
    const data = { ...newRow };
    data.index_1 = data.index_1 === '' ? null : data.index_1;
    data.index_2 = data.index_2 === '' ? null : data.index_2;
    onCreateContact(data);
    setNewRow(createEmptyRow(CONTACT_FIELDS));
  }, [newRow, onCreateContact]);

  const onCellValueChanged = useCallback((params) => {
    if (isPinnedRow(params)) {
      setNewRow(prev => ({ ...prev, [params.column.colId]: params.newValue }));
      return;
    }
    const { id, ...rest } = params.data;
    onUpdateContact(id, rest);
  }, [onUpdateContact]);

  const processDataFromClipboard = useCallback((params) => {
    const fields = ['first', 'last', 'title', 'firm', 'email', 'phone', 'city', 'state'];
    const rows = params.data;
    if (rows && rows.length > 0) {
      rows.forEach(row => {
        const obj = {};
        row.forEach((val, i) => {
          if (i < fields.length) obj[fields[i]] = val;
        });
        onPasteRows(obj);
      });
      return null; // prevent default paste
    }
    return params.data;
  }, [onPasteRows]);

  const pinnedBottomRowData = useMemo(() => [newRow], [newRow]);

  return (
    <div className="ag-theme-balham" style={{ width: '100%', height: 500 }}>
      <AgGridReact
        ref={gridRef}
        theme={themeBalham}
        rowData={contacts}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        pinnedBottomRowData={pinnedBottomRowData}
        onCellValueChanged={onCellValueChanged}
        processDataFromClipboard={processDataFromClipboard}
        getRowId={(params) => params.data.id != null ? String(params.data.id) : 'new'}
        singleClickEdit={true}
        stopEditingWhenCellsLoseFocus={true}
      />
    </div>
  );
}
