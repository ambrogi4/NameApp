import React from 'react';

export default function ContactTable({ contacts, onEdit, onDelete }) {
  return (
    <table>
      <thead>
        <tr>
          <th>First</th><th>Last</th><th>Title</th><th>Firm</th>
          <th>Email</th><th>City</th><th>State</th><th>Tags</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {contacts.map(c => (
          <tr key={c.id}>
            <td>{c.first}</td>
            <td>{c.last}</td>
            <td>{c.title}</td>
            <td>{c.firm}</td>
            <td>{c.email}</td>
            <td>{c.city}</td>
            <td>{c.state}</td>
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
