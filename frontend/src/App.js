import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AllCommunityModule } from 'ag-grid-community';
import { AgGridProvider } from 'ag-grid-react';
import {
  fetchConfig,
  fetchContacts, createContact, updateContact, deleteContact, createContactsBatch,
  fetchContent, createContent, updateContent, deleteContent,
  fetchActivities, createActivity, updateActivity, deleteActivity,
} from './apiService';
import ContactForm from './ContactForm';
import ContactTable from './ContactTable';
import ContentTable from './ContentTable';
import ContentUrlFetcher from './ContentUrlFetcher';
import ActivityTable from './ActivityTable';
import DupeReviewModal from './DupeReviewModal';
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

function App() {
  const TAB_ORDER = ['activities', 'contacts', 'content', 'filter', 'reports'];
  const [tab, setTab] = useState('activities');
  const [contacts, setContacts] = useState([]);
  const [content, setContent] = useState([]);
  const [activities, setActivities] = useState([]);
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

  const contactTableRef = useRef(null);
  const activityTableRef = useRef(null);
  const contentTableRef = useRef(null);

  const handleClearAllFilters = useCallback(() => {
    setQuickFilterText('');
    if (tab === 'contacts') contactTableRef.current?.clearFilters();
    else if (tab === 'activities') activityTableRef.current?.clearFilters();
    else if (tab === 'content') contentTableRef.current?.clearFilters();
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
      // Alt+X: Clear all filters
      if (e.key === 'x') { e.preventDefault(); handleClearAllFilters(); return; }
      // Direct tab shortcuts
      if (e.key === 'a') { e.preventDefault(); setTab('activities'); return; }
      if (e.key === 'c') { e.preventDefault(); setTab('contacts'); return; }
      if (e.key === 'n') { e.preventDefault(); setTab('content'); return; }
      if (e.key === 'f') { e.preventDefault(); setTab('filter'); return; }
      if (e.key === 'r') { e.preventDefault(); setTab('reports'); return; }
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
            <button className={tab === 'contacts' ? 'tab active' : 'tab'} onClick={() => setTab('contacts')}>Contacts</button>
            <button className={tab === 'content' ? 'tab active' : 'tab'} onClick={() => setTab('content')}>Content</button>
            <button className={tab === 'filter' ? 'tab active' : 'tab'} onClick={() => setTab('filter')}>Filter</button>
            <button className={tab === 'reports' ? 'tab active' : 'tab'} onClick={() => setTab('reports')}>Reports</button>
          </div>
          <AppMenu
            tab={tab}
            onNavigate={setTab}
            onGlobalLookup={handleMenuGlobalLookup}
            onLinkedInSearch={handleMenuLinkedInSearch}
            onOpenUrl={handleMenuOpenUrl}
            onClearFilters={handleClearAllFilters}
            onLinkedInImport={() => setShowLinkedInImport(true)}
            onConferenceImport={() => setShowConferenceImport(true)}
            onLinkedInUpdate={handleMenuLinkedInUpdate}
            onPaste={handleMenuPaste}
            onCopy={handleMenuCopy}
            onPageForward={handleMenuPageForward}
            onPageBackward={handleMenuPageBackward}
          />
          <div className="app-bar-right">
            {(tab === 'contacts' || tab === 'activities' || tab === 'content') && (
              <input
                type="text"
                className="app-bar-search"
                placeholder="Search..."
                value={quickFilterText}
                onChange={(e) => setQuickFilterText(e.target.value)}
              />
            )}
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
          <div style={{ display: tab === 'contacts' ? 'block' : 'none' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <ContactForm onSave={handleCreateContact} />
              <button
                onClick={() => setShowLinkedInImport(true)}
                style={{ padding: '4px 10px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                LinkedIn Import
              </button>
              <button
                onClick={() => setShowConferenceImport(true)}
                style={{ padding: '4px 10px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Conference Import
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
            />
          </div>
          <div style={{ display: tab === 'reports' ? 'block' : 'none' }}>
            <ReportsPage
              contacts={contacts}
              activities={activities}
              content={content}
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
            onSave={handleCreateContact}
            onClose={() => setShowLinkedInImport(false)}
          />
        )}
        {showConferenceImport && (
          <ConferenceImportModal
            onImport={handleDirectBatchCreate}
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
        <PasteConfirmBar
          pendingPaste={pendingPaste}
          lastPasteCount={lastPasteIds.length}
          onConfirm={handleConfirmPaste}
          onCancel={handleCancelPaste}
          onUndo={handleUndoPaste}
          onDismissUndo={handleDismissUndo}
        />
      </div>
    </AgGridProvider>
  );
}

export default App;
