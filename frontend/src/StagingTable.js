import React, { useState, useMemo, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeBalham } from 'ag-grid-community';
import { STAGED_CONTACT_FIELDS, SOURCE_TYPES, OUTREACH_CATEGORIES, isPinnedRow, createEmptyRow, copyRowsToClipboard } from './gridUtils';
import { guessStagedContactEmails, setStagedContactsBulkOC } from './apiService';
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
  onReviewMatches,
  onViewMatch,
  onRefreshStagedContacts,
  onPasteRows,
  onNewActivity,
  onConferenceImport,
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
    softRefresh: () => {
      onRefreshStagedContactsRef.current?.();
    },
    triggerProfileSearch: () => {
      // First check for pending profile update
      const PENDING_UPDATE_KEY = 'nameApp_pendingProfileUpdate';
      const pendingUpdate = localStorage.getItem(PENDING_UPDATE_KEY);
      if (pendingUpdate) {
        try {
          const data = JSON.parse(pendingUpdate);
          if (data && data.stagedId && data.profileData) {
            window.dispatchEvent(new CustomEvent('nameAppProfileUpdate', { detail: data }));
            localStorage.removeItem(PENDING_UPDATE_KEY);
            return;
          }
        } catch (err) {
          console.error('Error parsing pending update:', err);
        }
      }

      // No pending update, do LinkedIn search
      const api = gridRef.current?.api;
      if (!api) return;
      const cell = api.getFocusedCell();
      if (cell && !cell.rowPinned) {
        const rowNode = api.getDisplayedRowAtIndex(cell.rowIndex);
        if (rowNode?.data) {
          const staged = rowNode.data;
          // Store in localStorage for Chrome extension to pick up
          const pendingData = {
            id: staged.id,
            first: staged.first || '',
            last: staged.last || '',
            title: staged.title || '',
            firm: staged.firm || '',
            city: staged.city || '',
            state: staged.state || '',
            education: staged.education || '',
            li_url: staged.li_url || '',
          };
          localStorage.setItem('nameApp_pendingStagedContact', JSON.stringify(pendingData));
          // Build LinkedIn search URL
          const keywords = [staged.first, staged.last, staged.firm].filter(Boolean).join(' ');
          const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;
          window.open(searchUrl, '_blank');
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
  const onNewActivityRef = useRef(onNewActivity);
  onNewActivityRef.current = onNewActivity;
  const onRefreshStagedContactsRef = useRef(onRefreshStagedContacts);
  onRefreshStagedContactsRef.current = onRefreshStagedContacts;

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

    // Filter to contacts: enrichment_status === 'new', missing email, having firm
    const eligibleIds = ids.filter(id => {
      const contact = stagedContacts.find(c => c.id === id);
      return contact && contact.enrichment_status === 'new' && !contact.email && contact.firm;
    });

    if (eligibleIds.length === 0) {
      alert('No eligible contacts: selected contacts must have enrichment status "new", be missing an email, and have a firm.');
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

  // Check if any selected rows are eligible for email guessing (status = 'new')
  const anySelectedEligibleForGuess = useMemo(() => {
    return selectedStagedContacts.some(c =>
      c.enrichment_status === 'new' && !c.email && c.firm
    );
  }, [selectedStagedContacts]);

  // State for OC dropdown
  const [ocDropdownOpen, setOcDropdownOpen] = useState(false);

  const handleSetBulkOC = useCallback(async (oc) => {
    if (selectedRows.length === 0) return;
    try {
      await setStagedContactsBulkOC(selectedRows, oc);
      onRefreshStagedContacts?.();
    } catch (err) {
      console.error('Failed to set OC:', err);
      alert('Failed to set Outreach Category: ' + err.message);
    }
    setOcDropdownOpen(false);
  }, [selectedRows, onRefreshStagedContacts]);

  // Check if any selected rows are missing OC (for promotion validation display)
  const anySelectedMissingOC = useMemo(() => {
    return selectedStagedContacts.some(c => !c.outreach_category);
  }, [selectedStagedContacts]);

  // Close OC dropdown when clicking outside
  useEffect(() => {
    if (!ocDropdownOpen) return;
    const handleClickOutside = () => setOcDropdownOpen(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [ocDropdownOpen]);

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
      headerCheckboxSelectionFilteredOnly: true,
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
        {
          field: 'outreach_category',
          headerName: 'OC',
          width: 90,
          editable: true,
          cellEditor: 'agSelectCellEditor',
          cellEditorParams: { values: ['', ...OUTREACH_CATEGORIES] },
        },
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
  const onPasteRowsRef = useRef(onPasteRows);
  onPasteRowsRef.current = onPasteRows;

  // Paste handler — batch mode (Ctrl+Shift+V)
  const shiftPasteRef = useRef(false);
  useEffect(() => {
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
      const headerMode = nonEmpty.length > 0 && nonEmpty.every(v => STAGED_CONTACT_FIELDS.includes(v));

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
      if (parsedRows.length > 0 && onPasteRowsRef.current) {
        onPasteRowsRef.current(parsedRows, headerMode);
      }
    };

    el.addEventListener('keydown', handleKeyDown);
    el.addEventListener('paste', handlePaste);
    return () => {
      el.removeEventListener('keydown', handleKeyDown);
      el.removeEventListener('paste', handlePaste);
    };
  }, []);

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

      // Alt+P: profile search OR apply pending update
      // If there's a pending profile update, dispatch event to show modal
      // Otherwise, open LinkedIn search with staged contact's name/firm
      if (e.altKey && e.key === 'p') {
        e.preventDefault();

        // First check for pending profile update
        const PENDING_UPDATE_KEY = 'nameApp_pendingProfileUpdate';
        const pendingUpdate = localStorage.getItem(PENDING_UPDATE_KEY);
        if (pendingUpdate) {
          try {
            const data = JSON.parse(pendingUpdate);
            if (data && data.stagedId && data.profileData) {
              // Dispatch event for App.js to handle
              window.dispatchEvent(new CustomEvent('nameAppProfileUpdate', { detail: data }));
              localStorage.removeItem(PENDING_UPDATE_KEY);
              return;
            }
          } catch (err) {
            console.error('Error parsing pending update:', err);
          }
        }

        // No pending update, do LinkedIn search
        const api = gridRef.current?.api;
        if (!api) return;
        const cell = api.getFocusedCell();
        if (cell && !cell.rowPinned) {
          const rowNode = api.getDisplayedRowAtIndex(cell.rowIndex);
          if (rowNode?.data) {
            const staged = rowNode.data;
            // Store in localStorage for Chrome extension to pick up
            const pendingData = {
              id: staged.id,
              first: staged.first || '',
              last: staged.last || '',
              title: staged.title || '',
              firm: staged.firm || '',
              city: staged.city || '',
              state: staged.state || '',
              education: staged.education || '',
              li_url: staged.li_url || '',
            };
            localStorage.setItem('nameApp_pendingStagedContact', JSON.stringify(pendingData));
            console.log('[NameApp] Stored staged contact for extension:', pendingData);
            // Build LinkedIn search URL
            const keywords = [staged.first, staged.last, staged.firm].filter(Boolean).join(' ');
            const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;
            window.open(searchUrl, '_blank');
          }
        }
      }

      // Alt+A: new activity for focused staged contact (uses matched contact if exists)
      if (e.altKey && e.key === 'a') {
        e.preventDefault();
        const cell = gridRef.current?.api?.getFocusedCell();
        if (cell) {
          const rowNode = gridRef.current.api.getDisplayedRowAtIndex(cell.rowIndex);
          if (rowNode && !rowNode.rowPinned) {
            e.stopPropagation();
            const staged = rowNode.data;
            // If has_match, use the matched contact; otherwise pass staged data with name for display
            if (staged.matched_contact_id && onNewActivityRef.current) {
              onNewActivityRef.current({ id: staged.matched_contact_id, first: staged.first, last: staged.last });
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
    if (selectedRows.length === 0) return;

    // Separate has_match (need review) from no_match (direct create)
    const hasMatchStaged = [];
    const noMatchActions = [];

    selectedRows.forEach(id => {
      const staged = stagedContacts.find(s => s.id === id);
      if (!staged) return;
      if (staged.dupe_status === 'has_match' && staged.matched_contact_id) {
        const matchedContact = contacts.find(c => c.id === staged.matched_contact_id);
        if (matchedContact) {
          hasMatchStaged.push({ staged, matchedContact });
        }
      } else {
        noMatchActions.push({ id, action: 'create' });
      }
    });

    // Promote no_match records directly
    if (noMatchActions.length > 0) {
      onPromoteBatch(noMatchActions);
    }

    // Queue has_match records for duplicate review
    if (hasMatchStaged.length > 0 && onReviewMatches) {
      onReviewMatches(hasMatchStaged);
    }

    setSelectedRows([]);
    gridRef.current?.api?.deselectAll();
  }, [selectedRows, stagedContacts, contacts, onPromoteBatch, onReviewMatches]);

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
      <div className="staging-summary" style={{ marginBottom: '8px', fontSize: '14px', color: '#666', display: 'flex', alignItems: 'center', position: 'relative' }}>
        <button
          onClick={onConferenceImport}
          style={{ padding: '4px 10px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', position: 'absolute', left: 0 }}
        >
          Conference Import
        </button>
        <span style={{ width: '100%', textAlign: 'center' }}>{stagedContacts.length} staged | {noMatchCount} no match | {hasMatchCount} has match</span>
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
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  onClick={() => setOcDropdownOpen(!ocDropdownOpen)}
                  className="edit-btn"
                  style={{ minWidth: '80px' }}
                >
                  Set OC ▼
                </button>
                {ocDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    minWidth: '100px',
                  }}>
                    {OUTREACH_CATEGORIES.map(oc => (
                      <div
                        key={oc}
                        onClick={() => handleSetBulkOC(oc)}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #eee',
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                      >
                        {oc}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handlePromoteSelected}
                className="edit-btn"
                title={anySelectedMissingOC ? 'Some selected contacts are missing Outreach Category' : ''}
              >
                Promote Selected ({selectedRows.length}){anySelectedMissingOC ? ' ⚠' : ''}
              </button>
              <button onClick={handleSkipSelected} className="delete-btn">
                Skip Selected ({selectedRows.length})
              </button>
              {anySelectedEligibleForGuess && (
                <button onClick={handleGuessEmail} className="edit-btn">
                  Guess Email
                </button>
              )}
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
