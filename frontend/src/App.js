import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AllCommunityModule } from 'ag-grid-community';
import { AgGridProvider } from 'ag-grid-react';
import {
  fetchConfig,
  fetchContacts, createContact, updateContact, deleteContact, createContactsBatch,
  fetchContent, createContent, updateContent, deleteContent,
  fetchActivities, createActivity, updateActivity, deleteActivity,
  fetchStagedContacts, createStagedContact, createStagedContactsBatch,
  updateStagedContact, deleteStagedContact, promoteStagedContact, promoteStagedContactsBatch,
} from './apiService';
import ContactForm from './ContactForm';
import ContactTable from './ContactTable';
import ContentTable from './ContentTable';
import ContentUrlFetcher from './ContentUrlFetcher';
import ActivityTable from './ActivityTable';
import StagingTable from './StagingTable';
import StagingPromoteModal from './StagingPromoteModal';
import DupeReviewModal from './DupeReviewModal';
import MergeReviewModal from './MergeReviewModal';
import LinkedInImportModal from './LinkedInImportModal';
import LinkedInUpdateModal from './LinkedInUpdateModal';
import ConferenceImportModal from './ConferenceImportModal';
import PasteConfirmBar from './PasteConfirmBar';
import FancyFilterPage from './FancyFilterPage';
import ReportsPage from './ReportsPage';
import AppMenu from './AppMenu';
import { findDuplicate, findDuplicates } from './dupeUtils';
import { confirmBulkDelete, copyRowsToClipboard } from './gridUtils';
import './App.css';

const TAB_KEY = 'nameApp_currentTab';

function App() {
  const TAB_ORDER = ['activities', 'staging', 'contacts', 'content', 'filter', 'reports'];
  const [tab, setTab] = useState(() => {
    const saved = localStorage.getItem(TAB_KEY);
    return saved && TAB_ORDER.includes(saved) ? saved : 'activities';
  });

  // Persist tab to localStorage
  useEffect(() => {
    localStorage.setItem(TAB_KEY, tab);
  }, [tab]);
  const [contacts, setContacts] = useState([]);
  const [stagedContacts, setStagedContacts] = useState([]);
  const [content, setContent] = useState([]);
  const [activities, setActivities] = useState([]);
  const [stagingPromoteModal, setStagingPromoteModal] = useState(null);
  const [prefillContactId, setPrefillContactId] = useState(null);
  const [prefillContentId, setPrefillContentId] = useState(null);
  const [dupeReviewQueue, setDupeReviewQueue] = useState([]);
  const [instanceName, setInstanceName] = useState('myCRM');
  const [instanceColor, setInstanceColor] = useState('#87CEEB');
  const [quickFilterText, setQuickFilterText] = useState('');
  const [showLookup, setShowLookup] = useState(false);
  const [lookupSearch, setLookupSearch] = useState('');
  const [showLinkedInImport, setShowLinkedInImport] = useState(false);
  const [showConferenceImport, setShowConferenceImport] = useState(false);
  const [linkedInUpdateContact, setLinkedInUpdateContact] = useState(null);
  const [pendingPaste, setPendingPaste] = useState(null);
  const [lastPasteIds, setLastPasteIds] = useState([]);
  const [pendingStagedPaste, setPendingStagedPaste] = useState(null);
  const [stagingDupeReviewQueue, setStagingDupeReviewQueue] = useState([]);
  const [stagingPromoteReviewQueue, setStagingPromoteReviewQueue] = useState([]);

  const contactTableRef = useRef(null);
  const activityTableRef = useRef(null);
  const contentTableRef = useRef(null);
  const stagingTableRef = useRef(null);
  const searchInputRef = useRef(null);

  const handleClearAllFilters = useCallback(() => {
    setQuickFilterText('');
    if (tab === 'contacts') contactTableRef.current?.clearFilters();
    else if (tab === 'activities') activityTableRef.current?.clearFilters();
    else if (tab === 'content') contentTableRef.current?.clearFilters();
    else if (tab === 'staging') stagingTableRef.current?.clearFilters();
  }, [tab]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!e.altKey) return;
      // Alt+G: open global lookup
      if (e.key === 'g') {
        e.preventDefault();
        setShowLookup(true);
        setLookupSearch('');
        return;
      }
      // Alt+I: LinkedIn import
      if (e.key === 'i') { e.preventDefault(); setShowLinkedInImport(true); return; }
      // Alt+K: Conference import
      if (e.key === 'k') { e.preventDefault(); setShowConferenceImport(true); return; }
      // Alt+S: Focus global search
      if (e.key === 's') { e.preventDefault(); searchInputRef.current?.focus(); searchInputRef.current?.select(); return; }
      // Alt+X: Clear all filters
      if (e.key === 'x') { e.preventDefault(); handleClearAllFilters(); return; }
      // Direct tab shortcuts
      if (e.key === 'a') { e.preventDefault(); setTab('activities'); return; }
      if (e.key === 't') { e.preventDefault(); setTab('staging'); return; }
      if (e.key === 'c') { e.preventDefault(); setTab('contacts'); return; }
      if (e.key === 'n') { e.preventDefault(); setTab('content'); return; }
      if (e.key === 'f') { e.preventDefault(); setTab('filter'); return; }
      if (e.key === 'r') { e.preventDefault(); setTab('reports'); return; }
      // Alt+J: soft refresh for staging (J for "reJresh" or just available key)
      if (e.key === 'j') {
        e.preventDefault();
        if (tab === 'staging') {
          fetchStagedContacts().then(setStagedContacts).catch(console.error);
        }
        return;
      }
      // Alt+Up/Down: sequential cycling
      const idx = TAB_ORDER.indexOf(tab);
      if (e.key === 'ArrowUp' && idx > 0) {
        e.preventDefault();
        setTab(TAB_ORDER[idx - 1]);
      } else if (e.key === 'ArrowDown' && idx < TAB_ORDER.length - 1) {
        e.preventDefault();
        setTab(TAB_ORDER[idx + 1]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tab, TAB_ORDER, handleClearAllFilters]);

  useEffect(() => {
    fetchConfig().then(cfg => {
      setInstanceName(cfg.instanceName);
      document.title = cfg.instanceName;
      if (cfg.instanceColor) setInstanceColor(cfg.instanceColor);
    }).catch(console.error);
    fetchContacts().then(setContacts).catch(console.error);
    fetchStagedContacts().then(setStagedContacts).catch(console.error);
    fetchContent().then(setContent).catch(console.error);
    fetchActivities().then(setActivities).catch(console.error);
  }, []);

  // --- Contact handlers ---
  const handleCreateContact = (data) => {
    const match = findDuplicate(data, contacts);
    if (match) {
      setDupeReviewQueue([{ incoming: data, existing: match.existing, matchType: match.matchType }]);
      return;
    }
    createContact(data)
      .then(created => setContacts(prev => [...prev, created]))
      .catch(console.error);
  };

  const handleUpdateContact = (id, data) => {
    updateContact(id, data)
      .then(updated => setContacts(prev => prev.map(c => c.id === updated.id ? updated : c)))
      .catch(console.error);
  };

  // Paste from clipboard — stages data for confirmation
  const handlePasteContacts = (dataArray, headerMode) => {
    setLastPasteIds([]);
    setPendingPaste({ rows: dataArray, headerMode: !!headerMode });
  };

  // Confirm button on paste bar — runs dupe detection + batch create
  const handleConfirmPaste = () => {
    if (!pendingPaste) return;
    const { newRows, dupes } = findDuplicates(pendingPaste.rows, contacts);
    if (newRows.length > 0) {
      createContactsBatch(newRows)
        .then(created => {
          setContacts(prev => [...prev, ...created]);
          setLastPasteIds(created.map(c => c.id));
        })
        .catch(console.error);
    }
    if (dupes.length > 0) {
      setDupeReviewQueue(dupes);
    }
    setPendingPaste(null);
  };

  const handleCancelPaste = () => setPendingPaste(null);

  // Undo — delete recently pasted contacts
  const handleUndoPaste = () => {
    const ids = lastPasteIds;
    if (ids.length === 0) return;
    Promise.all(ids.map(id => deleteContact(id)))
      .then(() => {
        const idSet = new Set(ids);
        setContacts(prev => prev.filter(c => !idSet.has(c.id)));
        setActivities(prev => prev.filter(a => !idSet.has(a.contact_id)));
      })
      .catch(console.error);
    setLastPasteIds([]);
  };

  const handleDismissUndo = useCallback(() => setLastPasteIds([]), []);

  // Direct batch create — used by ConferenceImportModal (no confirmation needed)
  const handleDirectBatchCreate = (dataArray) => {
    const { newRows, dupes } = findDuplicates(dataArray, contacts);
    if (newRows.length > 0) {
      createContactsBatch(newRows)
        .then(created => setContacts(prev => [...prev, ...created]))
        .catch(console.error);
    }
    if (dupes.length > 0) {
      setDupeReviewQueue(dupes);
    }
  };

  const handleDupeMerge = (existingId, mergedFields) => {
    if (Object.keys(mergedFields).length === 0) return;
    updateContact(existingId, mergedFields)
      .then(updated => setContacts(prev => prev.map(c => c.id === updated.id ? updated : c)))
      .catch(console.error);
  };

  const handleDupeCreateAnyway = (data) => {
    createContact(data)
      .then(created => setContacts(prev => [...prev, created]))
      .catch(console.error);
  };

  // --- Staging paste handlers ---
  const handlePasteStagedContacts = (dataArray, headerMode) => {
    setPendingStagedPaste({ rows: dataArray, headerMode: !!headerMode });
  };

  const handleConfirmStagedPaste = () => {
    if (!pendingStagedPaste) return;
    const { newRows, dupes } = findDuplicates(pendingStagedPaste.rows, contacts);
    // Create non-dupes in staging
    if (newRows.length > 0) {
      createStagedContactsBatch(newRows)
        .then(() => fetchStagedContacts().then(setStagedContacts))
        .catch(console.error);
    }
    // Queue dupes for review
    if (dupes.length > 0) {
      setStagingDupeReviewQueue(dupes);
    }
    setPendingStagedPaste(null);
  };

  const handleCancelStagedPaste = () => setPendingStagedPaste(null);

  const handleStagingDupeMerge = (existingId, mergedFields) => {
    if (Object.keys(mergedFields).length === 0) return;
    updateContact(existingId, mergedFields)
      .then(updated => setContacts(prev => prev.map(c => c.id === updated.id ? updated : c)))
      .catch(console.error);
  };

  const handleStagingDupeCreateAnyway = (incoming, existing) => {
    // Create in staging with has_match status linking to the existing contact
    createStagedContact({
      ...incoming,
      dupe_status: 'has_match',
      matched_contact_id: existing.id,
    })
      .then(() => fetchStagedContacts().then(setStagedContacts))
      .catch(console.error);
  };

  // --- Staging promote review handlers (for Promote Selected with has_match) ---
  const handleReviewMatches = (matchPairs) => {
    // matchPairs is array of { staged, matchedContact }
    // Convert to format expected by MergeReviewModal: { incoming, existing, matchType }
    const items = matchPairs.map(({ staged, matchedContact }) => ({
      incoming: staged,
      existing: matchedContact,
      matchType: staged.li_url && matchedContact.li_url ? 'LinkedIn URL' : 'name match',
    }));
    setStagingPromoteReviewQueue(items);
  };

  const handlePromoteReviewMerge = (existingId, mergedFields, incoming) => {
    // Use the promote endpoint with merge option to ensure CR activity automation
    promoteStagedContact(incoming.id, { merge: true, merge_fields: mergedFields })
      .then(result => {
        setContacts(prev => prev.map(c => c.id === result.id ? result : c));
        fetchStagedContacts().then(setStagedContacts).catch(console.error);
        // Full refresh to ensure sync with DB
        fetchContacts().then(setContacts).catch(console.error);
        // Always refresh activities after promote (CR may have created one)
        fetchActivities().then(setActivities).catch(console.error);
      })
      .catch(console.error);
  };

  const handlePromoteReviewSkip = () => {
    // Skip means leave the staged contact as-is (don't delete, don't promote)
    // Just advance to the next one
  };

  const handlePromoteReviewCreateAnyway = (incoming) => {
    // Create as new contact (ignore the match)
    promoteStagedContact(incoming.id, { merge: false })
      .then(result => {
        if (result.created) {
          setContacts(prev => [...prev, result.created]);
        }
        fetchStagedContacts().then(setStagedContacts);
        // Full refresh to ensure sync with DB
        fetchContacts().then(setContacts).catch(console.error);
        // Always refresh activities after promote (CR may have created one)
        fetchActivities().then(setActivities).catch(console.error);
      })
      .catch(console.error);
  };

  const handleDeleteContact = (id) => {
    if (!window.confirm('Delete this contact and all its activities?')) return;
    deleteContact(id)
      .then(() => {
        setContacts(prev => prev.filter(c => c.id !== id));
        setActivities(prev => prev.filter(a => a.contact_id !== id));
      })
      .catch(console.error);
  };

  const handleDeleteContactsBatch = (ids) => {
    if (!confirmBulkDelete(ids.length, 'contact')) return;
    Promise.all(ids.map(id => deleteContact(id)))
      .then(() => {
        const idSet = new Set(ids);
        setContacts(prev => prev.filter(c => !idSet.has(c.id)));
        setActivities(prev => prev.filter(a => !idSet.has(a.contact_id)));
      })
      .catch(console.error);
  };

  // --- Staging handlers ---
  const handleCreateStagedContact = (data) => {
    createStagedContact(data)
      .then(created => setStagedContacts(prev => [...prev, created]))
      .catch(console.error);
  };

  const handleCreateStagedContactsBatch = (dataArray) => {
    createStagedContactsBatch(dataArray)
      .then(created => setStagedContacts(prev => [...prev, ...created]))
      .catch(console.error);
  };

  const handleUpdateStagedContact = (id, data) => {
    updateStagedContact(id, data)
      .then(updated => setStagedContacts(prev => prev.map(s => s.id === updated.id ? updated : s)))
      .catch(console.error);
  };

  const handleDeleteStagedContact = (id) => {
    deleteStagedContact(id)
      .then(() => setStagedContacts(prev => prev.filter(s => s.id !== id)))
      .catch(console.error);
  };

  const handlePromoteStagedContact = (id, options) => {
    promoteStagedContact(id, options)
      .then(contact => {
        setStagedContacts(prev => prev.filter(s => s.id !== id));
        setContacts(prev => {
          const exists = prev.find(c => c.id === contact.id);
          return exists
            ? prev.map(c => c.id === contact.id ? contact : c)
            : [...prev, contact];
        });
        // Full refresh to ensure sync with DB
        fetchContacts().then(setContacts).catch(console.error);
        // Always refresh activities after promote (CR may have created one)
        fetchActivities().then(setActivities).catch(console.error);
      })
      .catch(console.error);
  };

  const handlePromoteStagedBatch = (actions) => {
    promoteStagedContactsBatch(actions)
      .then(results => {
        const promotedIds = new Set([
          ...results.created.map(c => c.id),
          ...results.merged.map(m => m.staging_id),
          ...results.skipped,
        ]);
        setStagedContacts(prev => prev.filter(s => !promotedIds.has(s.id) && !results.skipped.includes(s.id)));
        // Add newly created contacts
        if (results.created.length > 0) {
          setContacts(prev => [...prev, ...results.created]);
        }
        // Update merged contacts
        if (results.merged.length > 0) {
          const mergedMap = {};
          results.merged.forEach(m => { mergedMap[m.contact.id] = m.contact; });
          setContacts(prev => prev.map(c => mergedMap[c.id] || c));
        }
        // Full refresh to ensure sync with DB
        fetchStagedContacts().then(setStagedContacts).catch(console.error);
        fetchContacts().then(setContacts).catch(console.error);
        // Always refresh activities after promote (CR may have created one)
        fetchActivities().then(setActivities).catch(console.error);
      })
      .catch(console.error);
  };

  const handleViewStagingMatch = (staged) => {
    if (!staged.matched_contact_id) return;
    const matchedContact = contacts.find(c => c.id === staged.matched_contact_id);
    if (matchedContact) {
      setStagingPromoteModal({ staged, matchedContact });
    }
  };

  const handleProfileSearch = useCallback(() => {
    stagingTableRef.current?.triggerProfileSearch?.();
  }, []);

  const handleSoftRefresh = useCallback(() => {
    stagingTableRef.current?.softRefresh?.();
  }, []);

  // --- Content handlers ---
  const handleCreateContent = (data) => {
    createContent(data)
      .then(created => setContent(prev => [...prev, created]))
      .catch(console.error);
  };

  const handleUpdateContent = (id, data) => {
    updateContent(id, data)
      .then(updated => setContent(prev => prev.map(c => c.id === updated.id ? updated : c)))
      .catch(console.error);
  };

  const handleDeleteContent = (id) => {
    if (!window.confirm('Delete this content? Activities referencing it will be unlinked.')) return;
    deleteContent(id)
      .then(() => {
        setContent(prev => prev.filter(c => c.id !== id));
        setActivities(prev => prev.map(a => a.content_id === id ? { ...a, content_id: null } : a));
      })
      .catch(console.error);
  };

  const handleDeleteContentBatch = (ids) => {
    if (!confirmBulkDelete(ids.length, 'content item')) return;
    Promise.all(ids.map(id => deleteContent(id)))
      .then(() => {
        const idSet = new Set(ids);
        setContent(prev => prev.filter(c => !idSet.has(c.id)));
        setActivities(prev => prev.map(a => idSet.has(a.content_id) ? { ...a, content_id: null } : a));
      })
      .catch(console.error);
  };

  // --- Activity handlers ---
  const handleCreateActivity = (data) => {
    createActivity(data)
      .then(created => setActivities(prev => [...prev, created]))
      .catch(console.error);
  };

  const handleUpdateActivity = (id, data) => {
    updateActivity(id, data)
      .then(updated => setActivities(prev => prev.map(a => a.id === updated.id ? updated : a)))
      .catch(console.error);
  };

  const handleNewActivityForContact = (contact) => {
    setPrefillContactId(contact.id);
    setTab('activities');
  };

  const handleNewActivityForContent = (contentItem) => {
    setPrefillContentId(contentItem.id);
    setTab('activities');
  };

  const handleCloseLookup = useCallback(() => {
    setShowLookup(false);
    setLookupSearch('');
  }, []);

  // Menu action callbacks
  const handleMenuGlobalLookup = useCallback(() => {
    setShowLookup(true);
    setLookupSearch('');
  }, []);

  const handleMenuFocusSearch = useCallback(() => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, []);

  const handleMenuLinkedInSearch = useCallback(() => {
    contactTableRef.current?.triggerLinkedInSearch?.();
  }, []);

  const handleMenuLinkedInUpdate = useCallback(() => {
    contactTableRef.current?.triggerLinkedInUpdate?.();
  }, []);

  const handleMenuOpenUrl = useCallback(() => {
    if (tab === 'contacts') contactTableRef.current?.triggerOpenUrl?.();
    else if (tab === 'content') contentTableRef.current?.triggerOpenUrl?.();
  }, [tab]);

  const handleMenuPaste = useCallback(() => {
    contactTableRef.current?.triggerPaste?.();
  }, []);

  const handleMenuCopy = useCallback(() => {
    let api = null;
    if (tab === 'contacts') api = contactTableRef.current?.getApi?.();
    else if (tab === 'activities') api = activityTableRef.current?.getApi?.();
    else if (tab === 'content') api = contentTableRef.current?.getApi?.();
    if (api) copyRowsToClipboard(api);
  }, [tab]);

  const handleMenuPageForward = useCallback(() => {
    if (tab === 'contacts') contactTableRef.current?.pageForward?.();
    else if (tab === 'activities') activityTableRef.current?.pageForward?.();
    else if (tab === 'content') contentTableRef.current?.pageForward?.();
  }, [tab]);

  const handleMenuPageBackward = useCallback(() => {
    if (tab === 'contacts') contactTableRef.current?.pageBackward?.();
    else if (tab === 'activities') activityTableRef.current?.pageBackward?.();
    else if (tab === 'content') contentTableRef.current?.pageBackward?.();
  }, [tab]);

  const handleDeleteActivity = (id) => {
    if (!window.confirm('Delete this activity?')) return;
    deleteActivity(id)
      .then(() => setActivities(prev => prev.filter(a => a.id !== id)))
      .catch(console.error);
  };

  const handleDeleteActivitiesBatch = (ids) => {
    if (!confirmBulkDelete(ids.length, 'activity')) return;
    Promise.all(ids.map(id => deleteActivity(id)))
      .then(() => {
        const idSet = new Set(ids);
        setActivities(prev => prev.filter(a => !idSet.has(a.id)));
      })
      .catch(console.error);
  };

  return (
    <AgGridProvider modules={[AllCommunityModule]}>
      <div className="App">
        <div className="app-bar">
          <span className="app-bar-title" style={{ background: instanceColor }}>{instanceName}</span>
          <div className="app-bar-tabs">
            <button className={tab === 'activities' ? 'tab active' : 'tab'} onClick={() => setTab('activities')}>Activities</button>
            <button className={tab === 'staging' ? 'tab active' : 'tab'} onClick={() => setTab('staging')}>
              Staging{stagedContacts.length > 0 && <span className="tab-badge">{stagedContacts.length}</span>}
            </button>
            <button className={tab === 'contacts' ? 'tab active' : 'tab'} onClick={() => setTab('contacts')}>Contacts</button>
            <button className={tab === 'content' ? 'tab active' : 'tab'} onClick={() => setTab('content')}>Content</button>
            <button className={tab === 'filter' ? 'tab active' : 'tab'} onClick={() => setTab('filter')}>Filter</button>
            <button className={tab === 'reports' ? 'tab active' : 'tab'} onClick={() => setTab('reports')}>Reports</button>
          </div>
          <AppMenu
            tab={tab}
            onNavigate={setTab}
            onGlobalLookup={handleMenuGlobalLookup}
            onFocusSearch={handleMenuFocusSearch}
            onLinkedInSearch={handleMenuLinkedInSearch}
            onOpenUrl={handleMenuOpenUrl}
            onClearFilters={handleClearAllFilters}
            onLinkedInImport={() => setShowLinkedInImport(true)}
            onConferenceImport={() => setShowConferenceImport(true)}
            onLinkedInUpdate={handleMenuLinkedInUpdate}
            onProfileSearch={handleProfileSearch}
            onSoftRefresh={handleSoftRefresh}
            onPaste={handleMenuPaste}
            onCopy={handleMenuCopy}
            onPageForward={handleMenuPageForward}
            onPageBackward={handleMenuPageBackward}
          />
          <div className="app-bar-right">
            {tab === 'contacts' && (
              <button
                className="cto-filter-btn"
                onClick={() => contactTableRef.current?.setCtoFilter?.()}
                title="Filter to CTO/CIO titles"
              >
                CTO/CIO
              </button>
            )}
            <input
              ref={searchInputRef}
              type="text"
              className="app-bar-search"
              placeholder="Search... (Alt+S)"
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
            />
            <button className="clear-filters-btn" onClick={handleClearAllFilters} title="Clear all filters and search (Alt+X)">
              Clear Filters
            </button>
            {tab === 'contacts' && (
              <span className="app-bar-count">{contacts.length}</span>
            )}
          </div>
        </div>
        <main>
          <div style={{ display: tab === 'activities' ? 'block' : 'none' }}>
            <ActivityTable
              ref={activityTableRef}
              activities={activities}
              contacts={contacts}
              content={content}
              onUpdateActivity={handleUpdateActivity}
              onCreateActivity={handleCreateActivity}
              onDeleteBatch={handleDeleteActivitiesBatch}
              quickFilterText={quickFilterText}
              prefillContactId={prefillContactId}
              prefillContentId={prefillContentId}
              onClearPrefill={() => { setPrefillContactId(null); setPrefillContentId(null); }}
            />
          </div>
          <div style={{ display: tab === 'staging' ? 'block' : 'none' }}>
            <StagingTable
              ref={stagingTableRef}
              stagedContacts={stagedContacts}
              contacts={contacts}
              onUpdateStagedContact={handleUpdateStagedContact}
              onCreateStagedContact={handleCreateStagedContact}
              onDeleteStagedContact={handleDeleteStagedContact}
              onPromoteStagedContact={handlePromoteStagedContact}
              onPromoteBatch={handlePromoteStagedBatch}
              onReviewMatches={handleReviewMatches}
              onViewMatch={handleViewStagingMatch}
              onRefreshStagedContacts={() => fetchStagedContacts().then(setStagedContacts).catch(console.error)}
              onPasteRows={handlePasteStagedContacts}
              onNewActivity={handleNewActivityForContact}
              onConferenceImport={() => setShowConferenceImport(true)}
              quickFilterText={quickFilterText}
            />
          </div>
          <div style={{ display: tab === 'contacts' ? 'block' : 'none' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <ContactForm onSave={handleCreateContact} />
              <button
                onClick={() => setShowLinkedInImport(true)}
                style={{ padding: '4px 10px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                LinkedIn Import
              </button>
            </div>
            <ContactTable
              ref={contactTableRef}
              contacts={contacts}
              onUpdateContact={handleUpdateContact}
              onCreateContact={handleCreateContact}
              onPasteRows={handlePasteContacts}
              onDeleteBatch={handleDeleteContactsBatch}
              onNewActivity={handleNewActivityForContact}
              onLinkedInUpdate={(contact) => setLinkedInUpdateContact(contact)}
              quickFilterText={quickFilterText}
            />
          </div>
          <div style={{ display: tab === 'content' ? 'block' : 'none' }}>
            <ContentUrlFetcher onFetched={handleCreateContent} />
            <ContentTable
              ref={contentTableRef}
              content={content}
              onUpdateContent={handleUpdateContent}
              onCreateContent={handleCreateContent}
              onDeleteBatch={handleDeleteContentBatch}
              onNewActivity={handleNewActivityForContent}
              quickFilterText={quickFilterText}
            />
          </div>
          <div style={{ display: tab === 'filter' ? 'block' : 'none' }}>
            <FancyFilterPage
              contacts={contacts}
              activities={activities}
              content={content}
              onUpdateContact={handleUpdateContact}
              onUpdateActivity={handleUpdateActivity}
              onCreateActivity={handleCreateActivity}
              onDeleteActivitiesBatch={handleDeleteActivitiesBatch}
              onNewActivityForContact={handleNewActivityForContact}
              onUpdateContent={handleUpdateContent}
              onDeleteContentBatch={handleDeleteContentBatch}
              onNewActivityForContent={handleNewActivityForContent}
              quickFilterText={quickFilterText}
            />
          </div>
          <div style={{ display: tab === 'reports' ? 'block' : 'none' }}>
            <ReportsPage
              contacts={contacts}
              activities={activities}
              content={content}
              quickFilterText={quickFilterText}
            />
          </div>
        </main>
        {showLookup && (
          <div className="lookup-overlay" onKeyDown={(e) => { if (e.key === 'Escape' && !e.altKey) { e.stopPropagation(); handleCloseLookup(); } }}>
            <div className="lookup-header">
              <span className="lookup-title">Global Lookup</span>
              <input
                type="text"
                className="lookup-search"
                placeholder="Search contacts..."
                value={lookupSearch}
                onChange={(e) => setLookupSearch(e.target.value)}
                autoFocus
              />
              <span className="lookup-hint">Alt+G to open | Esc to close</span>
              <button className="lookup-close" onClick={handleCloseLookup}>&times;</button>
            </div>
            <div className="lookup-grid-container">
              <ContactTable
                contacts={contacts}
                onUpdateContact={handleUpdateContact}
                onNewActivity={handleNewActivityForContact}
                quickFilterText={lookupSearch}
                lookupMode
                onDismiss={handleCloseLookup}
              />
            </div>
          </div>
        )}
        {showLinkedInImport && (
          <LinkedInImportModal
            onSave={handleCreateStagedContact}
            onClose={() => setShowLinkedInImport(false)}
          />
        )}
        {showConferenceImport && (
          <ConferenceImportModal
            onImport={handleCreateStagedContactsBatch}
            onClose={() => setShowConferenceImport(false)}
          />
        )}
        {linkedInUpdateContact && (
          <LinkedInUpdateModal
            contact={linkedInUpdateContact}
            onUpdate={handleUpdateContact}
            onClose={() => setLinkedInUpdateContact(null)}
          />
        )}
        {dupeReviewQueue.length > 0 && (
          <DupeReviewModal
            dupes={dupeReviewQueue}
            onMerge={handleDupeMerge}
            onSkip={() => {}}
            onCreateAnyway={handleDupeCreateAnyway}
            onClose={() => setDupeReviewQueue([])}
          />
        )}
        {stagingDupeReviewQueue.length > 0 && (
          <MergeReviewModal
            items={stagingDupeReviewQueue}
            title="Duplicate Review"
            existingLabel="Existing Contact"
            incomingLabel="Incoming"
            mergeLabel="Apply Merge"
            createLabel="Stage with Match"
            skipLabel="Skip"
            showSkip={true}
            onMerge={handleStagingDupeMerge}
            onSkip={() => {}}
            onCreateAnyway={handleStagingDupeCreateAnyway}
            onClose={() => setStagingDupeReviewQueue([])}
          />
        )}
        {stagingPromoteReviewQueue.length > 0 && (
          <MergeReviewModal
            items={stagingPromoteReviewQueue}
            title="Promote Review"
            existingLabel="Existing Contact"
            incomingLabel="Staged"
            mergeLabel="Merge & Promote"
            createLabel="Create New"
            skipLabel="Skip"
            showSkip={true}
            onMerge={handlePromoteReviewMerge}
            onSkip={handlePromoteReviewSkip}
            onCreateAnyway={handlePromoteReviewCreateAnyway}
            onClose={() => setStagingPromoteReviewQueue([])}
          />
        )}
        {stagingPromoteModal && (
          <StagingPromoteModal
            staged={stagingPromoteModal.staged}
            matchedContact={stagingPromoteModal.matchedContact}
            onPromote={handlePromoteStagedContact}
            onClose={() => setStagingPromoteModal(null)}
          />
        )}
        <PasteConfirmBar
          pendingPaste={pendingPaste}
          lastPasteCount={lastPasteIds.length}
          onConfirm={handleConfirmPaste}
          onCancel={handleCancelPaste}
          onUndo={handleUndoPaste}
          onDismissUndo={handleDismissUndo}
        />
        <PasteConfirmBar
          pendingPaste={pendingStagedPaste}
          lastPasteCount={0}
          onConfirm={handleConfirmStagedPaste}
          onCancel={handleCancelStagedPaste}
          onUndo={() => {}}
          onDismissUndo={() => {}}
          entityLabel="staged contacts"
        />
      </div>
    </AgGridProvider>
  );
}

export default App;
