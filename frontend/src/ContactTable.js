import React, { useState, useMemo, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeBalham } from 'ag-grid-community';
import { CONTACT_FIELDS, isPinnedRow, createEmptyRow, copyRowsToClipboard } from './gridUtils';
import SetFilter from './SetFilter';
import TagModal from './TagModal';

const ContactTable = forwardRef(function ContactTable({ contacts, onUpdateContact, onCreateContact, onPasteRows, onDeleteBatch, onNewActivity, onLinkedInUpdate, quickFilterText, lookupMode, onDismiss }, ref) {
  const gridRef = useRef(null);

  useImperativeHandle(ref, () => ({
    clearFilters: () => {
      const api = gridRef.current?.api;
      if (api) api.setFilterModel(null);
    },
    setCtoFilter: () => {
      const api = gridRef.current?.api;
      if (!api) return;
      // Patterns to match CTO/CIO titles:
      // 1. "Chief Technology Officer" anywhere
      // 2. "Chief Information Officer" anywhere
      // 3. "CTO" standalone: at start, end, after comma/space, before comma/space (but NOT "cto" within "Director")
      // 4. "CIO" standalone: same pattern
      const patterns = [
        'Chief Technology Officer',
        'Chief Information Officer',
        '(^|[\\s,])CTO($|[\\s,])',  // CTO at word boundary (not inside another word)
        '(^|[\\s,])CIO($|[\\s,])',  // CIO at word boundary
      ];
      api.setFilterModel({
        title: {
          condition: {
            operator: 'matchesAny',
            term: JSON.stringify(patterns),
            term2: '',
          },
          values: null,
        },
      });
    },
    getApi: () => gridRef.current?.api,
    pageForward: () => {
      const api = gridRef.current?.api;
      if (api) {
        api.paginationGoToNextPage();
        setTimeout(() => api.setFocusedCell(api.getFirstDisplayedRowIndex(), 'first', null), 50);
      }
    },
    pageBackward: () => {
      const api = gridRef.current?.api;
      if (api) {
        api.paginationGoToPreviousPage();
        setTimeout(() => api.setFocusedCell(api.getFirstDisplayedRowIndex(), 'first', null), 50);
      }
    },
    triggerLinkedInSearch: () => {
      const cell = gridRef.current?.api?.getFocusedCell();
      if (cell) {
        const rowNode = gridRef.current.api.getDisplayedRowAtIndex(cell.rowIndex);
        if (rowNode && !rowNode.rowPinned) {
          const d = rowNode.data;
          const terms = [d.first, d.last, d.title, d.firm, 'linkedin'].filter(Boolean);
          const query = encodeURIComponent(terms.join(' '));
          const left = window.screenX + 100;
          const top = window.screenY + 100;
          window.open(`https://www.google.com/search?q=${query}`, 'linkedinSearch', `popup=yes,width=1200,height=800,left=${left},top=${top}`);
        }
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
    triggerPaste: () => {
      // Focus the container to ensure paste event can be captured
      containerRef.current?.focus();
    },
    triggerLinkedInUpdate: () => {
      const cell = gridRef.current?.api?.getFocusedCell();
      if (cell) {
        const rowNode = gridRef.current.api.getDisplayedRowAtIndex(cell.rowIndex);
        if (rowNode && !rowNode.rowPinned && onLinkedInUpdateRef.current) {
          onLinkedInUpdateRef.current(rowNode.data);
        }
      }
    },
  }));

  const [newRow, setNewRow] = useState(createEmptyRow(CONTACT_FIELDS));
  const newRowRef = useRef(newRow);
  newRowRef.current = newRow;
  const onDeleteBatchRef = useRef(onDeleteBatch);
  onDeleteBatchRef.current = onDeleteBatch;
  const onNewActivityRef = useRef(onNewActivity);
  onNewActivityRef.current = onNewActivity;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const onLinkedInUpdateRef = useRef(onLinkedInUpdate);
  onLinkedInUpdateRef.current = onLinkedInUpdate;

  const [selectedRows, setSelectedRows] = useState([]);
  const [tagModal, setTagModal] = useState(null); // 'add' | 'delete' | null

  const parseTags = (s) => (s || '').split(',').map(t => t.trim()).filter(Boolean);
  const joinTags = (arr) => arr.join(', ');

  const selectedContacts = useMemo(() => {
    const idSet = new Set(selectedRows);
    return contacts.filter(c => idSet.has(c.id));
  }, [selectedRows, contacts]);

  const anySelectedHaveTags = useMemo(
    () => selectedContacts.some(c => parseTags(c.tags).length > 0),
    [selectedContacts]
  );

  const handleAddTags = useCallback((input) => {
    const newTags = parseTags(input);
    if (newTags.length === 0) return;
    selectedContacts.forEach(c => {
      const existing = parseTags(c.tags);
      const merged = [...existing, ...newTags.filter(t => !existing.includes(t))];
      const { id, ...rest } = c;
      onUpdateContact(id, { ...rest, tags: joinTags(merged) });
    });
    setTagModal(null);
  }, [selectedContacts, onUpdateContact]);

  const handleDeleteTag = useCallback((input) => {
    const tagToRemove = input.trim();
    if (!tagToRemove) return;
    selectedContacts.forEach(c => {
      const existing = parseTags(c.tags);
      const filtered = existing.filter(t => t !== tagToRemove);
      if (filtered.length !== existing.length) {
        const { id, ...rest } = c;
        onUpdateContact(id, { ...rest, tags: joinTags(filtered) });
      }
    });
    setTagModal(null);
  }, [selectedContacts, onUpdateContact]);

  const handleClearAllTags = useCallback(() => {
    if (!window.confirm(`Clear all tags from ${selectedContacts.length} contact(s)?`)) return;
    selectedContacts.forEach(c => {
      if (parseTags(c.tags).length > 0) {
        const { id, ...rest } = c;
        onUpdateContact(id, { ...rest, tags: '' });
      }
    });
  }, [selectedContacts, onUpdateContact]);

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
          columnGroupShow: 'open',
          valueParser: (params) => params.newValue === '' || params.newValue == null ? null : Number(params.newValue),
        },
        {
          field: 'index_2',
          headerName: 'Idx 2',
          width: 70,
          editable: true,
          columnGroupShow: 'open',
          valueParser: (params) => params.newValue === '' || params.newValue == null ? null : Number(params.newValue),
        },
        {
          field: 'created_date',
          headerName: 'Created',
          width: 110,
          editable: false,
          columnGroupShow: 'open',
          valueFormatter: (params) => params.value ? params.value.slice(0, 10) : '',
        },
      ],
    },
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: SetFilter,
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

  // Paste handler — batch mode (Ctrl+Shift+V only, disabled in lookup mode)
  const shiftPasteRef = useRef(false);
  useEffect(() => {
    if (lookupMode) return;
    const el = containerRef.current;
    if (!el) return;

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
        shiftPasteRef.current = true;
      }
    };

    const handlePaste = (e) => {
      if (!shiftPasteRef.current) return;
      shiftPasteRef.current = false;

      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const text = e.clipboardData?.getData('text/plain');
      if (!text) return;

      const rows = text.split('\n').filter(line => line.trim() !== '');
      if (rows.length === 0) return;

      e.preventDefault();

      // Check if first row is a header (all non-empty values are known field names)
      const positionalFields = ['first', 'last', 'title', 'firm', 'source', 'education',
        'email', 'phone', 'street', 'city', 'state', 'zip', 'country',
        'li_url', 'photo_url', 'tags', 'comment'];
      const firstCols = rows[0].split('\t').map(v => v.trim().toLowerCase());
      const nonEmpty = firstCols.filter(v => v !== '');
      const headerMode = nonEmpty.length > 0 && nonEmpty.every(v => CONTACT_FIELDS.includes(v));

      const fields = headerMode ? firstCols : positionalFields;
      const dataRows = headerMode ? rows.slice(1) : rows;

      const parsedRows = [];
      dataRows.forEach(row => {
        const cols = row.split('\t');
        const obj = {};
        cols.forEach((val, i) => {
          if (i < fields.length && fields[i] && val.trim() !== '') obj[fields[i]] = val.trim();
        });
        if (Object.keys(obj).length > 0) {
          parsedRows.push(obj);
        }
      });
      if (parsedRows.length > 0) {
        onPasteRowsRef.current(parsedRows, headerMode);
      }
    };

    el.addEventListener('keydown', handleKeyDown);
    el.addEventListener('paste', handlePaste);
    return () => {
      el.removeEventListener('keydown', handleKeyDown);
      el.removeEventListener('paste', handlePaste);
    };
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
          setTimeout(() => api.setFocusedCell(api.getFirstDisplayedRowIndex(), 'first', null), 50);
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

      // Alt+L: Google search for contact's LinkedIn profile
      if (e.altKey && e.key === 'l') {
        e.preventDefault();
        const cell = gridRef.current?.api?.getFocusedCell();
        if (cell) {
          const rowNode = gridRef.current.api.getDisplayedRowAtIndex(cell.rowIndex);
          if (rowNode && !rowNode.rowPinned) {
            const d = rowNode.data;
            const terms = [d.first, d.last, d.title, d.firm, 'linkedin'].filter(Boolean);
            const query = encodeURIComponent(terms.join(' '));
            const left = window.screenX + 100;
            const top = window.screenY + 100;
            window.open(`https://www.google.com/search?q=${query}`, 'linkedinSearch', `popup=yes,width=1200,height=800,left=${left},top=${top}`);
          }
        }
      }

      // Alt+D: open LinkedIn update modal for focused contact
      if (e.altKey && e.key === 'd') {
        e.preventDefault();
        const cell = gridRef.current?.api?.getFocusedCell();
        if (cell) {
          const rowNode = gridRef.current.api.getDisplayedRowAtIndex(cell.rowIndex);
          if (rowNode && !rowNode.rowPinned && onLinkedInUpdateRef.current) {
            onLinkedInUpdateRef.current(rowNode.data);
          }
        }
      }

      if (e.altKey && e.key === 'a') {
        e.preventDefault();
        const cell = gridRef.current?.api?.getFocusedCell();
        if (cell) {
          const rowNode = gridRef.current.api.getDisplayedRowAtIndex(cell.rowIndex);
          if (rowNode && !rowNode.rowPinned) {
            e.stopPropagation();
            if (onDismissRef.current) onDismissRef.current();
            onNewActivityRef.current(rowNode.data);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRows]);

  const onSelectionChanged = useCallback(() => {
    const nodes = gridRef.current?.api?.getSelectedNodes() || [];
    const ids = nodes
      .filter(n => !n.rowPinned)
      .map(n => n.data.id)
      .filter(id => id != null);
    setSelectedRows(ids);
  }, []);

  const pinnedBottomRowData = useMemo(() => lookupMode ? undefined : [newRow], [newRow, lookupMode]);

  const newRowHasData = !lookupMode && (newRow.first || newRow.last);

  const GROUP_KEY = lookupMode ? 'lookupTable_columnGroupState' : 'contactTable_columnGroupState';
  const COL_KEY = lookupMode ? 'lookupTable_columnState' : 'contactTable_columnState';

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
    <div style={lookupMode ? { height: '100%' } : undefined}>
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
            <>
              <button className="activity-btn" onClick={() => setTagModal('delete')}>
                Delete Tag
              </button>
              <button className="delete-btn" onClick={handleClearAllTags}>
                Clear All Tags
              </button>
            </>
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
      <div ref={containerRef} className="ag-theme-balham" style={{ width: '100%', height: lookupMode ? '100%' : 'calc(100vh - 118px)' }} tabIndex={0}>
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
      {tagModal === 'add' && (
        <TagModal
          title={`Add tags to ${selectedRows.length} contacts`}
          placeholder="Tag1, Tag2, ..."
          onConfirm={handleAddTags}
          onClose={() => setTagModal(null)}
        />
      )}
      {tagModal === 'delete' && (
        <TagModal
          title={`Remove tag from ${selectedRows.length} contacts`}
          placeholder="Tag to remove"
          onConfirm={handleDeleteTag}
          onClose={() => setTagModal(null)}
        />
      )}
    </div>
  );
});

export default ContactTable;
