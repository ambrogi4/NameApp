const API_URL = 'http://localhost:5000/api';

async function apiGet(path) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function apiPost(path, data) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

async function apiPut(path, data) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
  return res.json();
}

async function apiDelete(path) {
  const res = await fetch(`${API_URL}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
  return res.json();
}

// Contacts
export const fetchContacts = () => apiGet('/contacts');
export const createContact = (data) => apiPost('/contacts', data);
export const updateContact = (id, data) => apiPut(`/contacts/${id}`, data);
export const deleteContact = (id) => apiDelete(`/contacts/${id}`);

// Content
export const fetchContent = () => apiGet('/content');
export const createContent = (data) => apiPost('/content', data);
export const updateContent = (id, data) => apiPut(`/content/${id}`, data);
export const deleteContent = (id) => apiDelete(`/content/${id}`);

// Activities
export const fetchActivities = (contactId) =>
  apiGet(contactId ? `/activities?contact_id=${contactId}` : '/activities');
export const createActivity = (data) => apiPost('/activities', data);
export const updateActivity = (id, data) => apiPut(`/activities/${id}`, data);
export const deleteActivity = (id) => apiDelete(`/activities/${id}`);
