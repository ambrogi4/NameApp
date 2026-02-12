import React, { useState } from 'react';

const EMPTY = { first: '', last: '', title: '', firm: '', email: '', li_url: '' };

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
      <input name="first" value={form.first} onChange={handleChange} placeholder="First *" required />
      <input name="last" value={form.last} onChange={handleChange} placeholder="Last *" required />
      <input name="title" value={form.title} onChange={handleChange} placeholder="Title" />
      <input name="firm" value={form.firm} onChange={handleChange} placeholder="Firm" />
      <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email" />
      <input name="li_url" type="url" value={form.li_url} onChange={handleChange} placeholder="LinkedIn URL" />
      <button type="submit">Add</button>
    </form>
  );
}
