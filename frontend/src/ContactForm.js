import React, { useState } from 'react';

const EMPTY = { first: '', last: '', title: '', firm: '', email: '', li_url: '', tags: '' };

export default function ContactForm({ onSave }) {
  const [form, setForm] = useState(EMPTY);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
    setForm(EMPTY);
  };

  return (
    <form onSubmit={handleSubmit} className="quick-add-row">
      <span className="quick-add-label">Quick Add</span>
      <input name="first" value={form.first} onChange={handleChange} placeholder="First *" required style={{ maxWidth: 90 }} />
      <input name="last" value={form.last} onChange={handleChange} placeholder="Last *" required style={{ maxWidth: 90 }} />
      <input name="title" value={form.title} onChange={handleChange} placeholder="Title" style={{ maxWidth: 80 }} />
      <input name="firm" value={form.firm} onChange={handleChange} placeholder="Firm" style={{ maxWidth: 100 }} />
      <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email" style={{ maxWidth: 140 }} />
      <input name="li_url" type="url" value={form.li_url} onChange={handleChange} placeholder="LinkedIn URL" style={{ maxWidth: 140 }} />
      <input name="tags" value={form.tags} onChange={handleChange} placeholder="Tags" style={{ maxWidth: 100 }} />
      <button type="submit">Add</button>
    </form>
  );
}
