import React, { useState, useEffect } from 'react';
import {
  fetchContacts, createContact, updateContact, deleteContact,
  fetchContent, createContent, updateContent, deleteContent,
  fetchActivities, createActivity, updateActivity, deleteActivity,
} from './apiService';
import ContactForm from './ContactForm';
import ContactTable from './ContactTable';
import ContentForm from './ContentForm';
import ContentTable from './ContentTable';
import ActivityForm from './ActivityForm';
import ActivityTable from './ActivityTable';
import './App.css';

function App() {
  const [tab, setTab] = useState('contacts');
  const [contacts, setContacts] = useState([]);
  const [content, setContent] = useState([]);
  const [activities, setActivities] = useState([]);
  const [editingContact, setEditingContact] = useState(null);
  const [editingContent, setEditingContent] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);

  useEffect(() => {
    fetchContacts().then(setContacts).catch(console.error);
    fetchContent().then(setContent).catch(console.error);
    fetchActivities().then(setActivities).catch(console.error);
  }, []);

  // --- Contact handlers ---
  const handleSaveContact = (data) => {
    if (editingContact) {
      updateContact(editingContact.id, data)
        .then(updated => {
          setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
          setEditingContact(null);
        })
        .catch(console.error);
    } else {
      createContact(data)
        .then(created => setContacts(prev => [...prev, created]))
        .catch(console.error);
    }
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

  // --- Content handlers ---
  const handleSaveContent = (data) => {
    if (editingContent) {
      updateContent(editingContent.id, data)
        .then(updated => {
          setContent(prev => prev.map(c => c.id === updated.id ? updated : c));
          setEditingContent(null);
        })
        .catch(console.error);
    } else {
      createContent(data)
        .then(created => setContent(prev => [...prev, created]))
        .catch(console.error);
    }
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
  const handleSaveActivity = (data) => {
    if (editingActivity) {
      updateActivity(editingActivity.id, data)
        .then(updated => {
          setActivities(prev => prev.map(a => a.id === updated.id ? updated : a));
          setEditingActivity(null);
        })
        .catch(console.error);
    } else {
      createActivity(data)
        .then(created => setActivities(prev => [...prev, created]))
        .catch(console.error);
    }
  };

  const handleDeleteActivity = (id) => {
    if (!window.confirm('Delete this activity?')) return;
    deleteActivity(id)
      .then(() => setActivities(prev => prev.filter(a => a.id !== id)))
      .catch(console.error);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>NameApp</h1>
      </header>
      <nav className="tab-nav">
        <button className={tab === 'contacts' ? 'tab active' : 'tab'} onClick={() => setTab('contacts')}>Contacts</button>
        <button className={tab === 'activities' ? 'tab active' : 'tab'} onClick={() => setTab('activities')}>Activities</button>
        <button className={tab === 'content' ? 'tab active' : 'tab'} onClick={() => setTab('content')}>Content</button>
      </nav>
      <main>
        {tab === 'contacts' && (
          <>
            <ContactForm editing={editingContact} onSave={handleSaveContact} onCancel={() => setEditingContact(null)} />
            <hr />
            <ContactTable contacts={contacts} onEdit={setEditingContact} onDelete={handleDeleteContact} />
          </>
        )}
        {tab === 'activities' && (
          <>
            <ActivityForm editing={editingActivity} contacts={contacts} content={content} onSave={handleSaveActivity} onCancel={() => setEditingActivity(null)} />
            <hr />
            <ActivityTable activities={activities} contacts={contacts} onEdit={setEditingActivity} onDelete={handleDeleteActivity} />
          </>
        )}
        {tab === 'content' && (
          <>
            <ContentForm editing={editingContent} onSave={handleSaveContent} onCancel={() => setEditingContent(null)} />
            <hr />
            <ContentTable content={content} onEdit={setEditingContent} onDelete={handleDeleteContent} />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
