import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const handleKeyDown = (e) => {
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
          {tab === 'contacts' && (
            <div className="app-bar-right">
              <input
                type="text"
                className="app-bar-search"
                placeholder="Search..."
                value={quickFilterText}
                onChange={(e) => setQuickFilterText(e.target.value)}
              />
              <span className="app-bar-count">{contacts.length}</span>
            </div>
          )}
        </div>
        <main>
          <div style={{ display: tab === 'activities' ? 'block' : 'none' }}>
            <ActivityTable
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
              content={content}
              onUpdateContent={handleUpdateContent}
              onCreateContent={handleCreateContent}
              onDelete={handleDeleteContent}
            />
          </div>
        </main>
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
