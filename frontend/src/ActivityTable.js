import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeBalham } from 'ag-grid-community';
import { CHANNELS, ACTIVITY_FIELDS, isPinnedRow, createEmptyRow } from './gridUtils';
import SelectCellEditor from './SelectCellEditor';

export default function ActivityTable({ activities, contacts, content, onUpdateActivity, onCreateActivity, onDelete, prefillContactId, onClearPrefill }) {
  const gridRef = useRef(null);
  const [newRow, setNewRow] = useState(createEmptyRow(ACTIVITY_FIELDS));

  useEffect(() => {
    if (prefillContactId) {
      setNewRow(prev => ({ ...prev, contact_id: prefillContactId }));
    }
  }, [prefillContactId]);

  const contactOptions = useMemo(() =>
    contacts.map(c => ({ value: c.id, label: `${c.first} ${c.last}` })),
    [contacts]
  );

  const contentOptions = useMemo(() =>
    content.map(c => ({ value: c.id, label: c.short_name || c.title || `#${c.id}` })),
    [content]
  );

  const contactName = useCallback((id) => {
    const c = contacts.find(c => c.id === id);
    return c ? `${c.first} ${c.last}` : id ? `#${id}` : '';
  }, [contacts]);

  const contentName = useCallback((id) => {
    const c = content.find(c => c.id === id);
    return c ? (c.short_name || c.title || `#${c.id}`) : '';
  }, [content]);

  const columnDefs = useMemo(() => [
    { field: 'id', hide: true },
    {
      field: 'contact_id',
      headerName: 'Contact',
      width: 150,
      editable: true,
      valueFormatter: (params) => contactName(params.value),
      cellEditor: SelectCellEditor,
      cellEditorParams: { options: contactOptions, numeric: true, allowNull: false },
    },
    {
      field: 'content_id',
      headerName: 'Content',
      width: 140,
      editable: true,
      valueFormatter: (params) => contentName(params.value),
      cellEditor: SelectCellEditor,
      cellEditorParams: { options: contentOptions, numeric: true, allowNull: true },
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
          <button className="delete-btn" onClick={() => onDelete(params.data.id)} style={{ fontSize: 12, padding: '2px 8px' }}>
            Delete
          </button>
        );
      },
    },
  ], [contactName, contentName, contactOptions, contentOptions, onDelete]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: 'agTextColumnFilter',
    resizable: true,
  }), []);

  const handleSaveNew = useCallback(() => {
    const data = {
      ...newRow,
      contact_id: newRow.contact_id ? Number(newRow.contact_id) : null,
      content_id: newRow.content_id ? Number(newRow.content_id) : null,
      activity_date: newRow.activity_date || null,
    };
    onCreateActivity(data);
    setNewRow(createEmptyRow(ACTIVITY_FIELDS));
    if (onClearPrefill) onClearPrefill();
  }, [newRow, onCreateActivity, onClearPrefill]);

  const onCellValueChanged = useCallback((params) => {
    if (isPinnedRow(params)) {
      setNewRow(prev => ({ ...prev, [params.column.colId]: params.newValue }));
      return;
    }
    const { id, ...rest } = params.data;
    onUpdateActivity(id, rest);
  }, [onUpdateActivity]);

  const pinnedBottomRowData = useMemo(() => [newRow], [newRow]);

  return (
    <div className="ag-theme-balham" style={{ width: '100%', height: 500 }}>
      <AgGridReact
        ref={gridRef}
        theme={themeBalham}
        rowData={activities}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        pinnedBottomRowData={pinnedBottomRowData}
        onCellValueChanged={onCellValueChanged}
        getRowId={(params) => params.data.id != null ? String(params.data.id) : 'new'}
        singleClickEdit={true}
        stopEditingWhenCellsLoseFocus={true}
      />
    </div>
  );
}
