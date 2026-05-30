import React, { useState, useMemo, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeBalham } from 'ag-grid-community';
import { CHANNELS, ACTIVITY_FIELDS, isPinnedRow, createEmptyRow, copyRowsToClipboard } from './gridUtils';
import SelectCellEditor from './SelectCellEditor';
import SetFilter from './SetFilter';

const ActivityTable = forwardRef(function ActivityTable({ activities, contacts, content, onUpdateActivity, onCreateActivity, onDeleteBatch, prefillContactId, prefillContentId, onClearPrefill, lookupMode, onDismiss, quickFilterText }, ref) {
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
  const onDeleteBatchRef = useRef(onDeleteBatch);
  onDeleteBatchRef.current = onDeleteBatch;

  const [selectedRows, setSelectedRows] = useState([]);

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

  const focusPinnedContent = useCallback(() => {
    setTimeout(() => {
      const api = gridRef.current?.api;
      if (!api) return;
      const pinnedRowCount = api.getPinnedBottomRowCount();
      if (pinnedRowCount > 0) {
        api.setFocusedCell(0, 'content_id', 'bottom');
      }
    }, 100);
  }, []);

  useEffect(() => {
    if (prefillContactId) {
      setNewRow(prev => ({ ...prev, contact_id: prefillContactId }));
      focusPinnedContact();
    }
  }, [prefillContactId, focusPinnedContact]);

  useEffect(() => {
    if (prefillContentId) {
      setNewRow(prev => ({ ...prev, content_id: prefillContentId }));
      focusPinnedContent();
    }
  }, [prefillContentId, focusPinnedContent]);

  // Keyboard shortcuts
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

      // Shift+Alt+Left/Right: pagination
      if (e.shiftKey && e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        e.stopPropagation();
        const api = gridRef.current?.api;
        if (api) {
          if (e.key === 'ArrowLeft') api.paginationGoToPreviousPage();
          else api.paginationGoToNextPage();
          setTimeout(() => api.setFocusedCell(api.getFirstDisplayedRowIndex(), 'contact_id', null), 50);
        }
        return;
      }

      // Alt+U: open URL in focused cell
      if (e.altKey && e.key === 'u') {
        e.preventDefault();
        e.stopPropagation();
        const api = gridRef.current?.api;
        if (api) {
          const cell = api.getFocusedCell();
          if (cell && cell.rowPinned !== 'bottom') {
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

      // Alt+Enter: save if on pinned row, otherwise jump to pinned row
      if (e.altKey && e.key === 'Enter') {
        e.preventDefault();
        const api = gridRef.current?.api;
        const cell = api?.getFocusedCell();
        if (cell && cell.rowPinned === 'bottom') {
          const row = newRowRef.current;
          if (row.contact_id) {
            handleSaveNewRef.current();
          }
        } else {
          focusPinnedContact();
        }
        return;
      }

      // Alt+A: copy contact_id from focused row into new row
      if (e.altKey && e.key === 'a') {
        e.preventDefault();
        e.stopPropagation();
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

      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      // Ctrl+C: copy selected/focused rows to clipboard
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const api = gridRef.current?.api;
        if (api) {
          e.preventDefault();
          copyRowsToClipboard(api);
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        gridRef.current?.api?.deselectAll();
        setSelectedRows([]);
        return;
      }

      if (e.key === 'Delete' && selectedRows.length > 0) {
        e.preventDefault();
        onDeleteBatchRef.current(selectedRows);
        setSelectedRows([]);
        gridRef.current?.api?.deselectAll();
      }
    };
    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [focusPinnedContact, selectedRows]);

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

  // Refresh formatted values when contacts/content load or change
  useEffect(() => {
    const api = gridRef.current?.api;
    if (api) {
      api.refreshCells({ columns: ['contact_id', 'content_id'], force: true });
    }
  }, [contacts, content]);

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
      field: 'contact_id',
      headerName: 'Contact',
      width: 150,
      editable: true,
      valueFormatter: (params) => contactNameRef.current(params.value),
      getQuickFilterText: (params) => contactNameRef.current(params.value),
      cellEditor: SelectCellEditor,
      cellEditorParams: () => ({ options: contactOptionsRef.current, numeric: true, allowNull: false }),
    },
    {
      field: 'content_id',
      headerName: 'Content',
      width: 140,
      editable: true,
      valueFormatter: (params) => contentNameRef.current(params.value),
      getQuickFilterText: (params) => contentNameRef.current(params.value),
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
    {
      field: 'activity_date',
      headerName: 'Date',
      width: 110,
      editable: true,
      cellEditor: 'agDateStringCellEditor',
      comparator: (valueA, valueB, nodeA, nodeB) => {
        const dateCmp = (valueA || '').localeCompare(valueB || '');
        if (dateCmp !== 0) return dateCmp;
        const caA = nodeA.data.created_at || '';
        const caB = nodeB.data.created_at || '';
        return caA.localeCompare(caB);
      },
    },
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
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: SetFilter,
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

  const onSelectionChanged = useCallback(() => {
    const nodes = gridRef.current?.api?.getSelectedNodes() || [];
    const ids = nodes
      .filter(n => !n.rowPinned)
      .map(n => n.data.id)
      .filter(id => id != null);
    setSelectedRows(ids);
  }, []);

  const pinnedBottomRowData = useMemo(() => lookupMode ? undefined : [newRow], [newRow, lookupMode]);

  const newRowHasData = !lookupMode && newRow.contact_id;

  const STORAGE_KEY = 'activityTable_columnState_v2';

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
    <div>
      {!lookupMode && (newRowHasData || selectedRows.length > 0) && (
        <div className="contact-toolbar">
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
        </div>
      )}
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
          quickFilterText={quickFilterText}
          pagination={true}
          paginationPageSize={20}
          paginationPageSizeSelector={[20, 100]}
          rowSelection="multiple"
          suppressRowClickSelection={true}
          onSelectionChanged={onSelectionChanged}
        />
      </div>
    </div>
  );
});

export default ActivityTable;
