import React, { useState, useMemo, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeBalham } from 'ag-grid-community';
import { CONTENT_TYPES, CONTENT_FIELDS, isPinnedRow, createEmptyRow, copyRowsToClipboard } from './gridUtils';
import SetFilter from './SetFilter';
import TagModal from './TagModal';

const ContentTable = forwardRef(function ContentTable({ content, onUpdateContent, onCreateContent, onDeleteBatch, onNewActivity, quickFilterText, lookupMode }, ref) {
  const gridRef = useRef(null);

  useImperativeHandle(ref, () => ({
    clearFilters: () => {
      const api = gridRef.current?.api;
      if (api) api.setFilterModel(null);
    },
    getApi: () => gridRef.current?.api,
    pageForward: () => {
      const api = gridRef.current?.api;
      if (api) {
        api.paginationGoToNextPage();
        setTimeout(() => api.setFocusedCell(api.getFirstDisplayedRowIndex(), 'short_name', null), 50);
      }
    },
    pageBackward: () => {
      const api = gridRef.current?.api;
      if (api) {
        api.paginationGoToPreviousPage();
        setTimeout(() => api.setFocusedCell(api.getFirstDisplayedRowIndex(), 'short_name', null), 50);
      }
    },
    triggerOpenUrl: () => {
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
    },
  }));
  const [newRow, setNewRow] = useState(createEmptyRow(CONTENT_FIELDS));
  const newRowRef = useRef(newRow);
  newRowRef.current = newRow;
  const onNewActivityRef = useRef(onNewActivity);
  onNewActivityRef.current = onNewActivity;
  const onDeleteBatchRef = useRef(onDeleteBatch);
  onDeleteBatchRef.current = onDeleteBatch;

  const [selectedRows, setSelectedRows] = useState([]);
  const [tagModal, setTagModal] = useState(null); // 'add' | 'delete' | null

  const parseTags = (s) => (s || '').split(',').map(t => t.trim()).filter(Boolean);
  const joinTags = (arr) => arr.join(', ');

  const selectedContent = useMemo(() => {
    const idSet = new Set(selectedRows);
    return content.filter(c => idSet.has(c.id));
  }, [selectedRows, content]);

  const anySelectedHaveTags = useMemo(
    () => selectedContent.some(c => parseTags(c.tags).length > 0),
    [selectedContent]
  );

  const handleAddTags = useCallback((input) => {
    const newTags = parseTags(input);
    if (newTags.length === 0) return;
    selectedContent.forEach(c => {
      const existing = parseTags(c.tags);
      const merged = [...existing, ...newTags.filter(t => !existing.includes(t))];
      const { id, ...rest } = c;
      onUpdateContent(id, { ...rest, tags: joinTags(merged) });
    });
    setTagModal(null);
  }, [selectedContent, onUpdateContent]);

  const handleDeleteTag = useCallback((input) => {
    const tagToRemove = input.trim();
    if (!tagToRemove) return;
    selectedContent.forEach(c => {
      const existing = parseTags(c.tags);
      const filtered = existing.filter(t => t !== tagToRemove);
      if (filtered.length !== existing.length) {
        const { id, ...rest } = c;
        onUpdateContent(id, { ...rest, tags: joinTags(filtered) });
      }
    });
    setTagModal(null);
  }, [selectedContent, onUpdateContent]);

  const containerRef = useRef(null);

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
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: SetFilter,
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

  const onSelectionChanged = useCallback(() => {
    const nodes = gridRef.current?.api?.getSelectedNodes() || [];
    const ids = nodes
      .filter(n => !n.rowPinned)
      .map(n => n.data.id)
      .filter(id => id != null);
    setSelectedRows(ids);
  }, []);

  const pinnedBottomRowData = useMemo(() => lookupMode ? undefined : [newRow], [newRow, lookupMode]);

  const newRowHasData = !lookupMode && (newRow.type || newRow.title || newRow.short_name);

  const STORAGE_KEY = 'contentTable_columnState_v2';

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

  // Keyboard shortcuts (use window to capture events even when AG Grid cells have focus)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      // Only handle if this grid's container is visible/active
      if (!containerRef.current?.offsetParent) return;

      // Ctrl+C: copy selected/focused rows to clipboard
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const api = gridRef.current?.api;
        if (api) {
          e.preventDefault();
          copyRowsToClipboard(api);
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
          setTimeout(() => api.setFocusedCell(api.getFirstDisplayedRowIndex(), 'type', null), 50);
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
        return;
      }

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
      // Alt+A: create activity for focused content row
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
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRows]);

  return (
    <div>
      {!lookupMode && (newRowHasData || selectedRows.length > 0) && (
        <div className="contact-toolbar">
          {newRowHasData && (
            <button onClick={handleSaveNew} style={{ backgroundColor: '#4CAF50', color: 'white' }}>
              Save New
            </button>
          )}
          {selectedRows.length >= 2 && (
            <button className="edit-btn" onClick={() => setTagModal('add')}>
              Add Tags
            </button>
          )}
          {selectedRows.length >= 2 && anySelectedHaveTags && (
            <button className="activity-btn" onClick={() => setTagModal('delete')}>
              Delete Tag
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
          quickFilterText={quickFilterText}
          pagination={true}
          paginationPageSize={20}
          paginationPageSizeSelector={[20, 100]}
          rowSelection="multiple"
          suppressRowClickSelection={true}
          onSelectionChanged={onSelectionChanged}
        />
      </div>
      {tagModal === 'add' && (
        <TagModal
          title={`Add tags to ${selectedRows.length} content items`}
          placeholder="Tag1, Tag2, ..."
          onConfirm={handleAddTags}
          onClose={() => setTagModal(null)}
        />
      )}
      {tagModal === 'delete' && (
        <TagModal
          title={`Remove tag from ${selectedRows.length} content items`}
          placeholder="Tag to remove"
          onConfirm={handleDeleteTag}
          onClose={() => setTagModal(null)}
        />
      )}
    </div>
  );
});

export default ContentTable;
