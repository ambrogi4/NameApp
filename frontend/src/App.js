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
import FancyFilterPage from './FancyFilterPage';
import ReportsPage from './ReportsPage';
import { findDuplicate, findDuplicates } from './dupeUtils';
import { confirmBulkDelete } from './gridUtils';
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
  const [quickFilterText, setQuickFilterText] = useState('');
  const [showLookup, setShowLookup] = useState(false);
  const [lookupSearch, setLookupSearch] = useState('');

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
  }, [tab, TAB_ORDER]);

  useEffect(() => {
    fetchConfig().then(cfg => {
      setInstanceName(cfg.instanceName);
      document.title = cfg.instanceName;
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

  const handlePasteContacts = (dataArray) => {
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
          <span className="app-bar-title">{instanceName}</span>
          <div className="app-bar-tabs">
            <button className={tab === 'activities' ? 'tab active' : 'tab'} onClick={() => setTab('activities')}>Activities</button>
            <button className={tab === 'contacts' ? 'tab active' : 'tab'} onClick={() => setTab('contacts')}>Contacts</button>
            <button className={tab === 'content' ? 'tab active' : 'tab'} onClick={() => setTab('content')}>Content</button>
            <button className={tab === 'filter' ? 'tab active' : 'tab'} onClick={() => setTab('filter')}>Filter</button>
            <button className={tab === 'reports' ? 'tab active' : 'tab'} onClick={() => setTab('reports')}>Reports</button>
          </div>
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
            <button className="clear-filters-btn" onClick={handleClearAllFilters} title="Clear all filters and search">
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
            <ContactForm onSave={handleCreateContact} />
            <ContactTable
              ref={contactTableRef}
              contacts={contacts}
              onUpdateContact={handleUpdateContact}
              onCreateContact={handleCreateContact}
              onPasteRows={handlePasteContacts}
              onDeleteBatch={handleDeleteContactsBatch}
              onNewActivity={handleNewActivityForContact}
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
        {dupeReviewQueue.length > 0 && (
          <DupeReviewModal
            dupes={dupeReviewQueue}
            onMerge={handleDupeMerge}
            onSkip={() => {}}
            onCreateAnyway={handleDupeCreateAnyway}
            onClose={() => setDupeReviewQueue([])}
          />
        )}
      </div>
    </AgGridProvider>
  );
}

export default App;
