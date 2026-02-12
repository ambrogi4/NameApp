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
    <>
      <div className="form-header">
        <h2>Quick Add Contact</h2>
      </div>
      <form onSubmit={handleSubmit} className="grid-form">
        <label>First *<input name="first" value={form.first} onChange={handleChange} required /></label>
        <label>Last *<input name="last" value={form.last} onChange={handleChange} required /></label>
        <label>Title<input name="title" value={form.title} onChange={handleChange} /></label>
        <label>Firm<input name="firm" value={form.firm} onChange={handleChange} /></label>
        <label>Email<input name="email" type="email" value={form.email} onChange={handleChange} /></label>
        <label>LinkedIn URL<input name="li_url" type="url" value={form.li_url} onChange={handleChange} /></label>
        <button type="submit">Add</button>
      </form>
    </>
  );
}
