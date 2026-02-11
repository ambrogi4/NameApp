import React from 'react';

export default function ActivityTable({ activities, contacts, onEdit, onDelete }) {
  const contactName = (id) => {
    const c = contacts.find(c => c.id === id);
    return c ? `${c.first} ${c.last}` : `#${id}`;
  };

  return (
    <table>
      <thead>
        <tr>
          <th>Contact</th><th>Channel</th><th>Date</th>
          <th>Topic</th><th>Responded</th><th>Email Opened</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {activities.map(a => (
          <tr key={a.id}>
            <td>{contactName(a.contact_id)}</td>
            <td>{a.channel}</td>
            <td>{a.activity_date}</td>
            <td>{a.topic}</td>
            <td>{a.contact_responded ? 'Yes' : 'No'}</td>
            <td>{a.email_opened ? 'Yes' : 'No'}</td>
            <td>
              <button className="edit-btn" onClick={() => onEdit(a)}>Edit</button>
              <button className="delete-btn" onClick={() => onDelete(a.id)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
