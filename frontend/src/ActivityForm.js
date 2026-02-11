import React, { useState, useEffect } from 'react';

const CHANNELS = ['linkedin', 'email', 'phone', 'text', 'in_person', 'other'];
const EMPTY = {
  contact_id: '', content_id: '', activity_date: '',
  channel: '', contact_responded: false, email_opened: false,
  topic: '', comment: '', in_crm: false,
};

export default function ActivityForm({ editing, contacts, content, onSave, onCancel }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (editing) {
      setForm({
        ...EMPTY,
        ...editing,
        contact_id: editing.contact_id ?? '',
        content_id: editing.content_id ?? '',
        activity_date: editing.activity_date || '',
      });
    } else {
      setForm(EMPTY);
    }
  }, [editing]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      contact_id: Number(form.contact_id),
      content_id: form.content_id ? Number(form.content_id) : null,
      activity_date: form.activity_date || null,
    };
    onSave(data);
    if (!editing) setForm(EMPTY);
  };

  return (
    <>
      <div className="form-header">
        <h2>{editing ? 'Edit Activity' : 'Add Activity'}</h2>
        {editing && <button type="button" onClick={onCancel} className="cancel-btn">Cancel Edit</button>}
      </div>
      <form onSubmit={handleSubmit} className="grid-form">
        <label>Contact *
          <select name="contact_id" value={form.contact_id} onChange={handleChange} required>
            <option value="">-- select --</option>
            {contacts.map(c => <option key={c.id} value={c.id}>{c.first} {c.last}</option>)}
          </select>
        </label>
        <label>Content
          <select name="content_id" value={form.content_id} onChange={handleChange}>
            <option value="">-- none --</option>
            {content.map(c => <option key={c.id} value={c.id}>{c.short_name || c.title}</option>)}
          </select>
        </label>
        <label>Channel
          <select name="channel" value={form.channel} onChange={handleChange}>
            <option value="">-- select --</option>
            {CHANNELS.map(ch => <option key={ch} value={ch}>{ch}</option>)}
          </select>
        </label>
        <label>Date<input name="activity_date" type="date" value={form.activity_date} onChange={handleChange} /></label>
        <label>Topic<input name="topic" value={form.topic} onChange={handleChange} /></label>
        <label className="full-width">Comment<textarea name="comment" value={form.comment} onChange={handleChange} rows="2" /></label>
        <label className="checkbox-label"><input name="contact_responded" type="checkbox" checked={form.contact_responded} onChange={handleChange} /> Contact Responded</label>
        <label className="checkbox-label"><input name="email_opened" type="checkbox" checked={form.email_opened} onChange={handleChange} /> Email Opened</label>
        <label className="checkbox-label"><input name="in_crm" type="checkbox" checked={form.in_crm} onChange={handleChange} /> In CRM</label>
        <button type="submit">{editing ? 'Update' : 'Add'}</button>
      </form>
    </>
  );
}
