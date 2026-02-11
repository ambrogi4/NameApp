import React from 'react';

export default function ContentTable({ content, onEdit, onDelete }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Short Name</th><th>Type</th><th>Title</th>
          <th>Author</th><th>Tags</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {content.map(c => (
          <tr key={c.id}>
            <td>{c.short_name}</td>
            <td>{c.type}</td>
            <td>{c.title}</td>
            <td>{c.author}</td>
            <td>{c.tags}</td>
            <td>
              <button className="edit-btn" onClick={() => onEdit(c)}>Edit</button>
              <button className="delete-btn" onClick={() => onDelete(c.id)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
