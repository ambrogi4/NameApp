import React, { useState, useMemo, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeBalham } from 'ag-grid-community';
import { STAGED_CONTACT_FIELDS, SOURCE_TYPES, isPinnedRow, createEmptyRow, copyRowsToClipboard } from './gridUtils';
import { guessStagedContactEmails } from './apiService';
import SetFilter from './SetFilter';
import TagModal from './TagModal';

const StagingTable = forwardRef(function StagingTable({
  stagedContacts,
  contacts,
  onUpdateStagedContact,
  onCreateStagedContact,
  onDeleteStagedContact,
  onPromoteStagedContact,
  onPromoteBatch,
  onViewMatch,
  onRefreshStagedContacts,
  quickFilterText,
}, ref) {
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

  const [newRow, setNewRow] = useState(createEmptyRow(STAGED_CONTACT_FIELDS, { source_type: 'manual' }));
  const newRowRef = useRef(newRow);
  newRowRef.current = newRow;

  const onDeleteStagedContactRef = useRef(onDeleteStagedContact);
  onDeleteStagedContactRef.current = onDeleteStagedContact;
  const onPromoteStagedContactRef = useRef(onPromoteStagedContact);
  onPromoteStagedContactRef.current = onPromoteStagedContact;
  const onViewMatchRef = useRef(onViewMatch);
  onViewMatchRef.current = onViewMatch;

  const [selectedRows, setSelectedRows] = useState([]);
  const [tagModal, setTagModal] = useState(null); // 'add' | 'delete' | null

  // Tag helpers
  const parseTags = (s) => (s || '').split(',').map(t => t.trim()).filter(Boolean);
  const joinTags = (arr) => arr.join(', ');

  const selectedStagedContacts = useMemo(() => {
    const idSet = new Set(selectedRows);
    return stagedContacts.filter(c => idSet.has(c.id));
  }, [selectedRows, stagedContacts]);

  const anySelectedHaveTags = useMemo(
    () => selectedStagedContacts.some(c => parseTags(c.tags).length > 0),
    [selectedStagedContacts]
  );

  const handleAddTags = useCallback((input) => {
    const newTags = parseTags(input);
    if (newTags.length === 0) return;
    selectedStagedContacts.forEach(c => {
      const existing = parseTags(c.tags);
      const merged = [...existing, ...newTags.filter(t => !existing.includes(t))];
      const { id, ...rest } = c;
      onUpdateStagedContact(id, { ...rest, tags: joinTags(merged) });
    });
    setTagModal(null);
  }, [selectedStagedContacts, onUpdateStagedContact]);

  const handleDeleteTag = useCallback((input) => {
    const tagToRemove = input.trim();
    if (!tagToRemove) return;
    selectedStagedContacts.forEach(c => {
      const existing = parseTags(c.tags);
      const filtered = existing.filter(t => t !== tagToRemove);
      if (filtered.length !== existing.length) {
        const { id, ...rest } = c;
        onUpdateStagedContact(id, { ...rest, tags: joinTags(filtered) });
      }
    });
    setTagModal(null);
  }, [selectedStagedContacts, onUpdateStagedContact]);

  const handleClearAllTags = useCallback(() => {
    if (!window.confirm(`Clear all tags from ${selectedStagedContacts.length} staged contact(s)?`)) return;
    selectedStagedContacts.forEach(c => {
      if (parseTags(c.tags).length > 0) {
        const { id, ...rest } = c;
        onUpdateStagedContact(id, { ...rest, tags: '' });
      }
    });
  }, [selectedStagedContacts, onUpdateStagedContact]);

  const handleGuessEmail = useCallback(async () => {
    // Get IDs: selected rows if any, otherwise focused row
    let ids = [];
    if (selectedRows.length > 0) {
      ids = selectedRows;
    } else {
      const api = gridRef.current?.api;
      const cell = api?.getFocusedCell();
      if (cell && !cell.rowPinned) {
        const rowNode = api.getDisplayedRowAtIndex(cell.rowIndex);
        if (rowNode?.data?.id) {
          ids = [rowNode.data.id];
        }
      }
    }

    if (ids.length === 0) return;

    // Filter to contacts missing email AND having firm
    const eligibleIds = ids.filter(id => {
      const contact = stagedContacts.find(c => c.id === id);
      return contact && !contact.email && contact.firm;
    });

    if (eligibleIds.length === 0) {
      alert('No eligible contacts: all selected contacts either have an email or are missing a firm.');
      return;
    }

    try {
      await guessStagedContactEmails(eligibleIds);
      onRefreshStagedContacts?.();
    } catch (err) {
      console.error('Failed to guess emails:', err);
      alert('Failed to guess emails: ' + err.message);
    }
  }, [selectedRows, stagedContacts, onRefreshStagedContacts]);

  // Build a map of contact IDs to contact data for fast lookup (use ref to avoid columnDefs recreation)
  const contactsByIdRef = useRef({});
  contactsByIdRef.current = useMemo(() => {
    const map = {};
    contacts.forEach(c => { map[c.id] = c; });
    return map;
  }, [contacts]);

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
      headerName: 'Status',
      children: [
        {
          field: 'dupe_status',
          headerName: 'Dupe',
          width: 95,
          editable: false,
          cellStyle: (params) => {
            if (params.value === 'has_match') return { backgroundColor: '#fff3cd', color: '#856404' };
            if (params.value === 'no_match') return { backgroundColor: '#d4edda', color: '#155724' };
            if (params.value === 'pending') return { backgroundColor: '#e2e3e5', color: '#383d41' };
            return null;
          },
        },
        {
          field: 'source_type',
          headerName: 'Source Type',
          width: 115,
          editable: true,
          cellEditor: 'agSelectCellEditor',
          cellEditorParams: { values: SOURCE_TYPES },
        },
        {
          field: 'matched_contact_id',
          headerName: 'Match ID',
          width: 85,
          editable: false,
          valueFormatter: (params) => params.value ? `#${params.value}` : '-',
          columnGroupShow: 'open',
        },
        {
          headerName: 'Matched Name',
          width: 140,
          editable: false,
          valueGetter: (params) => {
            const matchId = params.data?.matched_contact_id;
            if (!matchId) return '';
            const match = contactsByIdRef.current[matchId];
            return match ? `${match.first} ${match.last}` : '(deleted)';
          },
          columnGroupShow: 'open',
        },
      ],
    },
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
      headerName: 'Enrichment',
      children: [
        {
          field: 'email_confidence',
          headerName: 'Email Conf',
          width: 95,
          editable: false,
          cellStyle: (params) => {
            if (params.value === 'verified') return { backgroundColor: '#d4edda', color: '#155724' };
            if (params.value === 'guessed') return { backgroundColor: '#fff3cd', color: '#856404' };
            return null;
          },
        },
        {
          field: 'enrichment_status',
          headerName: 'Enriched',
          width: 90,
          editable: false,
          columnGroupShow: 'open',
        },
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
    onCreateStagedContact(data);
    setNewRow(createEmptyRow(STAGED_CONTACT_FIELDS, { source_type: 'manual' }));
  }, [onCreateStagedContact]);

  const onCellValueChanged = useCallback((params) => {
    if (isPinnedRow(params)) {
      setNewRow(prev => ({ ...prev, [params.column.colId]: params.newValue }));
      return;
    }
    const { id, ...rest } = params.data;
    onUpdateStagedContact(id, rest);
  }, [onUpdateStagedContact]);

  const containerRef = useRef(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!containerRef.current?.offsetParent) return;

      // Ctrl+C: copy
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
        selectedRows.forEach(id => onDeleteStagedContactRef.current(id));
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

      // Alt+P: promote focused row
      if (e.altKey && e.key === 'p') {
        e.preventDefault();
        const cell = gridRef.current?.api?.getFocusedCell();
        if (cell) {
          const rowNode = gridRef.current.api.getDisplayedRowAtIndex(cell.rowIndex);
          if (rowNode && !rowNode.rowPinned) {
            const staged = rowNode.data;
            if (staged.dupe_status === 'has_match') {
              onViewMatchRef.current?.(staged);
            } else {
              onPromoteStagedContactRef.current(staged.id, {});
            }
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

  const pinnedBottomRowData = useMemo(() => [newRow], [newRow]);
  const newRowHasData = newRow.first || newRow.last;

  // Counts
  const noMatchCount = useMemo(() => stagedContacts.filter(s => s.dupe_status === 'no_match').length, [stagedContacts]);
  const hasMatchCount = useMemo(() => stagedContacts.filter(s => s.dupe_status === 'has_match').length, [stagedContacts]);

  const handlePromoteAllNoMatch = useCallback(() => {
    const ids = stagedContacts
      .filter(s => s.dupe_status === 'no_match')
      .map(s => ({ id: s.id, action: 'create' }));
    if (ids.length === 0) return;
    if (!window.confirm(`Promote ${ids.length} contact(s) with no match?`)) return;
    onPromoteBatch(ids);
  }, [stagedContacts, onPromoteBatch]);

  const handlePromoteSelected = useCallback(() => {
    const actions = selectedRows.map(id => {
      const staged = stagedContacts.find(s => s.id === id);
      return {
        id,
        action: staged?.dupe_status === 'has_match' ? 'merge' : 'create'
      };
    });
    if (actions.length === 0) return;
    onPromoteBatch(actions);
    setSelectedRows([]);
    gridRef.current?.api?.deselectAll();
  }, [selectedRows, stagedContacts, onPromoteBatch]);

  const handleSkipSelected = useCallback(() => {
    if (selectedRows.length === 0) return;
    if (!window.confirm(`Skip and delete ${selectedRows.length} staged contact(s)?`)) return;
    const actions = selectedRows.map(id => ({ id, action: 'skip' }));
    onPromoteBatch(actions);
    setSelectedRows([]);
    gridRef.current?.api?.deselectAll();
  }, [selectedRows, onPromoteBatch]);

  const GROUP_KEY = 'stagingTable_columnGroupState';
  const COL_KEY = 'stagingTable_columnState';

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
      <div className="staging-summary" style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>
        {stagedContacts.length} staged | {noMatchCount} no match | {hasMatchCount} has match
      </div>
      {(newRowHasData || selectedRows.length > 0 || noMatchCount > 0) && (
        <div className="contact-toolbar">
          {newRowHasData && (
            <button onClick={handleSaveNew} style={{ backgroundColor: '#4CAF50', color: 'white' }}>
              Save New
            </button>
          )}
          {noMatchCount > 0 && (
            <button onClick={handlePromoteAllNoMatch} className="edit-btn">
              Promote All No-Match ({noMatchCount})
            </button>
          )}
          {selectedRows.length > 0 && (
            <>
              <button onClick={handlePromoteSelected} className="edit-btn">
                Promote Selected ({selectedRows.length})
              </button>
              <button onClick={handleSkipSelected} className="delete-btn">
                Skip Selected ({selectedRows.length})
              </button>
              <button onClick={handleGuessEmail} className="edit-btn">
                Guess Email
              </button>
            </>
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
        </div>
      )}
      <div ref={containerRef} className="ag-theme-balham" style={{ width: '100%', height: 'calc(100vh - 155px)' }} tabIndex={0}>
        <AgGridReact
          ref={gridRef}
          theme={themeBalham}
          rowData={stagedContacts}
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
          title={`Add tags to ${selectedRows.length} staged contacts`}
          placeholder="Tag1, Tag2, ..."
          onConfirm={handleAddTags}
          onClose={() => setTagModal(null)}
        />
      )}
      {tagModal === 'delete' && (
        <TagModal
          title={`Remove tag from ${selectedRows.length} staged contacts`}
          placeholder="Tag to remove"
          onConfirm={handleDeleteTag}
          onClose={() => setTagModal(null)}
        />
      )}
    </div>
  );
});

export default StagingTable;
