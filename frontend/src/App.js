import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AllCommunityModule } from 'ag-grid-community';
import { AgGridProvider } from 'ag-grid-react';
import {
  fetchContacts, createContact, updateContact, deleteContact, createContactsBatch,
  fetchContent, createContent, updateContent, deleteContent,
  fetchActivities, createActivity, updateActivity, deleteActivity,
} from './apiService';
import ContactForm from './ContactForm';
import ContactTable from './ContactTable';
import ContentTable from './ContentTable';
import ActivityTable from './ActivityTable';
import DupeReviewModal from './DupeReviewModal';
import FancyFilterPanel from './FancyFilterPanel';
import { findDuplicate, findDuplicates } from './dupeUtils';
import './App.css';

function App() {
  const TAB_ORDER = ['activities', 'contacts', 'content'];
  const [tab, setTab] = useState('activities');
  const [contacts, setContacts] = useState([]);
  const [content, setContent] = useState([]);
  const [activities, setActivities] = useState([]);
  const [prefillContactId, setPrefillContactId] = useState(null);
  const [dupeReviewQueue, setDupeReviewQueue] = useState([]);
  const [quickFilterText, setQuickFilterText] = useState('');
  const [showLookup, setShowLookup] = useState(false);
  const [lookupSearch, setLookupSearch] = useState('');
  const [showFancyFilter, setShowFancyFilter] = useState(false);
  const [fancyFilterResults, setFancyFilterResults] = useState(null);
  const [fancyFilterResultTable, setFancyFilterResultTable] = useState(null);

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
      // Alt+G: open global lookup
      if (e.altKey && e.key === 'g') {
        e.preventDefault();
        setShowLookup(true);
        setLookupSearch('');
        return;
      }
      // Alt+F: open fancy filter
      if (e.altKey && e.key === 'f') {
        e.preventDefault();
        setShowFancyFilter(true);
        setFancyFilterResults(null);
        setFancyFilterResultTable(null);
        return;
      }
      if (!e.altKey) return;
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
    if (!window.confirm(`Delete ${ids.length} contact(s) and all their activities?`)) return;
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

  const handleCloseLookup = useCallback(() => {
    setShowLookup(false);
    setLookupSearch('');
  }, []);

  const handleCloseFancyFilter = useCallback(() => {
    setShowFancyFilter(false);
    setFancyFilterResults(null);
    setFancyFilterResultTable(null);
  }, []);

  const handleRunFancyFilter = useCallback((template, params) => {
    const data = { contacts, activities, content };
    const results = template.execute(data, params);
    setFancyFilterResults(results);
    setFancyFilterResultTable(template.resultTable);
  }, [contacts, activities, content]);

  const handleDeleteActivity = (id) => {
    if (!window.confirm('Delete this activity?')) return;
    deleteActivity(id)
      .then(() => setActivities(prev => prev.filter(a => a.id !== id)))
      .catch(console.error);
  };

  return (
    <AgGridProvider modules={[AllCommunityModule]}>
      <div className="App">
        <div className="app-bar">
          <span className="app-bar-title">myCRM</span>
          <div className="app-bar-tabs">
            <button className={tab === 'activities' ? 'tab active' : 'tab'} onClick={() => setTab('activities')}>Activities</button>
            <button className={tab === 'contacts' ? 'tab active' : 'tab'} onClick={() => setTab('contacts')}>Contacts</button>
            <button className={tab === 'content' ? 'tab active' : 'tab'} onClick={() => setTab('content')}>Content</button>
          </div>
          <div className="app-bar-right">
            {tab === 'contacts' && (
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
              onDelete={handleDeleteActivity}
              prefillContactId={prefillContactId}
              onClearPrefill={() => setPrefillContactId(null)}
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
            <ContentTable
              ref={contentTableRef}
              content={content}
              onUpdateContent={handleUpdateContent}
              onCreateContent={handleCreateContent}
              onDelete={handleDeleteContent}
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
        {showFancyFilter && (
          <div className="lookup-overlay" onKeyDown={(e) => { if (e.key === 'Escape' && !e.altKey) { e.stopPropagation(); handleCloseFancyFilter(); } }}>
            <div className="lookup-header">
              <span className="lookup-title">Fancy Filter</span>
              <FancyFilterPanel
                contacts={contacts}
                content={content}
                onRun={handleRunFancyFilter}
                resultCount={fancyFilterResults ? fancyFilterResults.length : null}
              />
              <span className="lookup-hint">Alt+F to open | Esc to close</span>
              <button className="lookup-close" onClick={handleCloseFancyFilter}>&times;</button>
            </div>
            <div className="lookup-grid-container">
              {fancyFilterResults && fancyFilterResultTable === 'contacts' && (
                <ContactTable
                  contacts={fancyFilterResults}
                  onUpdateContact={handleUpdateContact}
                  onNewActivity={handleNewActivityForContact}
                  quickFilterText=""
                  lookupMode
                  onDismiss={handleCloseFancyFilter}
                />
              )}
              {fancyFilterResults && fancyFilterResultTable === 'activities' && (
                <ActivityTable
                  activities={fancyFilterResults}
                  contacts={contacts}
                  content={content}
                  onUpdateActivity={handleUpdateActivity}
                  onCreateActivity={handleCreateActivity}
                  onDelete={handleDeleteActivity}
                  lookupMode
                  onDismiss={handleCloseFancyFilter}
                />
              )}
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
