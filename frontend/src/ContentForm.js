import React, { useState, useEffect } from 'react';

const TYPES = ['pdf', 'youtube', 'article', 'podcast', 'webinar'];
const EMPTY = {
  type: '', short_name: '', title: '', author: '',
  publish_date: '', link: '', tags: '', comment: '',
};

export default function ContentForm({ editing, onSave, onCancel }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (editing) {
      setForm({ ...EMPTY, ...editing, publish_date: editing.publish_date || '' });
    } else {
      setForm(EMPTY);
    }
  }, [editing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, publish_date: form.publish_date || null });
    if (!editing) setForm(EMPTY);
  };

  return (
    <>
      <div className="form-header">
        <h2>{editing ? 'Edit Content' : 'Add Content'}</h2>
        {editing && <button type="button" onClick={onCancel} className="cancel-btn">Cancel Edit</button>}
      </div>
      <form onSubmit={handleSubmit} className="grid-form">
        <label>Type
          <select name="type" value={form.type} onChange={handleChange}>
            <option value="">-- select --</option>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label>Short Name<input name="short_name" value={form.short_name} onChange={handleChange} /></label>
        <label>Title<input name="title" value={form.title} onChange={handleChange} /></label>
        <label>Author<input name="author" value={form.author} onChange={handleChange} /></label>
        <label>Publish Date<input name="publish_date" type="date" value={form.publish_date} onChange={handleChange} /></label>
        <label>Link<input name="link" type="url" value={form.link} onChange={handleChange} /></label>
        <label>Tags<input name="tags" value={form.tags} onChange={handleChange} placeholder="comma-separated" /></label>
        <label className="full-width">Comment<textarea name="comment" value={form.comment} onChange={handleChange} rows="2" /></label>
        <button type="submit">{editing ? 'Update' : 'Add'}</button>
      </form>
    </>
  );
}
