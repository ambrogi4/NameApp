import React, { useState, useEffect } from 'react';
import { fetchAllPeople, createPerson, updatePerson, deletePerson } from './apiService';
import './App.css';

function App() {
  const [people, setPeople] = useState([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tags, setTags] = useState('');
  const [comment, setComment] = useState('');
  const [city, setCity] = useState('');
  const [st, setSt] = useState('');
  const [ctry, setCtry] = useState('');
  const [LI_url, setLI_url] = useState('');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchAllPeople()
      .then(data => setPeople(data))
      .catch(error => console.error('Error fetching people:', error));
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    
    if (editingId) {
      // Update existing person
      updatePerson(editingId, firstName, lastName, title, company, email, phone, tags, comment, city, st, ctry, LI_url)
        .then(updatedPerson => {
          setPeople(people.map(person => person.id === editingId ? updatedPerson : person));
          clearForm();
        })
        .catch(error => console.error('Error updating person:', error));
    } else {
      // Create new person
      createPerson(firstName, lastName, title, company, email, phone, tags, comment, city, st, ctry, LI_url)
        .then(newPerson => {
          setPeople([...people, newPerson]);
          clearForm();
        })
        .catch(error => console.error('Error creating person:', error));
    }
  };

  const clearForm = () => {
    setFirstName('');
    setLastName('');
    setTitle('');
    setCompany('');
    setEmail('');
    setPhone('');
    setTags('');
    setComment('');
    setCity('');
    setSt('');
    setCtry('');
    setLI_url('');
    setEditingId(null);
  };

  const handleEdit = (person) => {
    setFirstName(person.first_name);
    setLastName(person.last_name);
    setTitle(person.title || '');
    setCompany(person.company || '');
    setEmail(person.email || '');
    setPhone(person.phone || '');
    setTags(person.tags || '');
    setComment(person.comment || '');
    setCity(person.city || '');
    setSt(person.st || '');
    setCtry(person.ctry || '');
    setLI_url(person.LI_url || '');
    setEditingId(person.id);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this person?')) {
      deletePerson(id)
        .then(() => {
          setPeople(people.filter(person => person.id !== id));
        })
        .catch(error => console.error('Error deleting person:', error));
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Name Management</h1>
      </header>
      <main>
        <div className="form-header">
          <h2>{editingId ? 'Edit Person' : 'Add New Person'}</h2>
          {editingId && (
            <button type="button" onClick={clearForm} className="cancel-btn">
              Cancel Edit
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First Name"
            required
          />
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last Name"
            required
          />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
          />
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
          />
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags (comma-separated)"
          />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comments"
            rows="3"
          />
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
          />
          <input
            type="text"
            value={st}
            onChange={(e) => setSt(e.target.value)}
            placeholder="ST"
            className="input-small"
            maxLength="2"
          />
          <input
            type="text"
            value={ctry}
            onChange={(e) => setCtry(e.target.value)}
            placeholder="CTY"
            className="input-small"
            maxLength="3"
          />
          <input
            type="url"
            value={LI_url}
            onChange={(e) => setLI_url(e.target.value)}
            placeholder="LinkedIn URL"
          />
          <button type="submit">{editingId ? 'Update' : 'Add'}</button>
        </form>
        <hr />
        <table>
          <thead>
            <tr>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Title</th>
              <th>Company</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Tags</th>
              <th>Comment</th>
              <th>City</th>
              <th>State</th>
              <th>Country</th>
              <th>LinkedIn</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {people.map(person => (
              <tr key={person.id}>
                <td>{person.first_name}</td>
                <td>{person.last_name}</td>
                <td>{person.title}</td>
                <td>{person.company}</td>
                <td>{person.email}</td>
                <td>{person.phone}</td>
                <td>{person.tags}</td>
                <td>{person.comment}</td>
                <td>{person.city}</td>
                <td>{person.st}</td>
                <td>{person.ctry}</td>
                <td>{person.LI_url ? <a href={person.LI_url} target="_blank" rel="noopener noreferrer">LinkedIn</a> : ''}</td>
                <td>
                  <button onClick={() => handleEdit(person)} className="edit-btn">Edit</button>
                  <button onClick={() => handleDelete(person.id)} className="delete-btn">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}

export default App;
