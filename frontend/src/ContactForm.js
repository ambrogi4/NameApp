import React, { useState, useEffect } from 'react';

const EMPTY = {
  first: '', last: '', title: '', firm: '', source: '', education: '',
  tags: '', comment: '', email: '', phone: '', street: '', city: '',
  state: '', zip: '', country: '', li_url: '', photo_url: '',
  in_crm: false, index_1: '', index_2: '',
};

export default function ContactForm({ editing, onSave, onCancel }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (editing) {
      setForm({
        ...EMPTY,
        ...editing,
        index_1: editing.index_1 ?? '',
        index_2: editing.index_2 ?? '',
        in_crm: editing.in_crm ?? false,
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
    const data = { ...form };
    data.index_1 = data.index_1 === '' ? null : Number(data.index_1);
    data.index_2 = data.index_2 === '' ? null : Number(data.index_2);
    onSave(data);
    if (!editing) setForm(EMPTY);
  };

  return (
    <>
      <div className="form-header">
        <h2>{editing ? 'Edit Contact' : 'Add Contact'}</h2>
        {editing && <button type="button" onClick={onCancel} className="cancel-btn">Cancel Edit</button>}
      </div>
      <form onSubmit={handleSubmit} className="grid-form">
        <label>First *<input name="first" value={form.first} onChange={handleChange} required /></label>
        <label>Last *<input name="last" value={form.last} onChange={handleChange} required /></label>
        <label>Title<input name="title" value={form.title} onChange={handleChange} /></label>
        <label>Firm<input name="firm" value={form.firm} onChange={handleChange} /></label>
        <label>Source<input name="source" value={form.source} onChange={handleChange} /></label>
        <label>Education<input name="education" value={form.education} onChange={handleChange} /></label>
        <label>Email<input name="email" type="email" value={form.email} onChange={handleChange} /></label>
        <label>Phone<input name="phone" type="tel" value={form.phone} onChange={handleChange} /></label>
        <label>Street<input name="street" value={form.street} onChange={handleChange} /></label>
        <label>City<input name="city" value={form.city} onChange={handleChange} /></label>
        <label>State<input name="state" value={form.state} onChange={handleChange} /></label>
        <label>Zip<input name="zip" value={form.zip} onChange={handleChange} /></label>
        <label>Country<input name="country" value={form.country} onChange={handleChange} /></label>
        <label>LinkedIn URL<input name="li_url" type="url" value={form.li_url} onChange={handleChange} /></label>
        <label>Photo URL<input name="photo_url" type="url" value={form.photo_url} onChange={handleChange} /></label>
        <label>Tags<input name="tags" value={form.tags} onChange={handleChange} placeholder="comma-separated" /></label>
        <label className="full-width">Comment<textarea name="comment" value={form.comment} onChange={handleChange} rows="2" /></label>
        <label className="checkbox-label"><input name="in_crm" type="checkbox" checked={form.in_crm} onChange={handleChange} /> In CRM</label>
        <label>Index 1<input name="index_1" type="number" value={form.index_1} onChange={handleChange} /></label>
        <label>Index 2<input name="index_2" type="number" value={form.index_2} onChange={handleChange} /></label>
        <button type="submit">{editing ? 'Update' : 'Add'}</button>
      </form>
    </>
  );
}
