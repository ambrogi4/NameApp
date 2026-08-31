const API_BASE = 'http://100.121.134.27:5000/api';
const MYCRM_URL_PATTERNS = [
  'http://localhost:5000/*',
  'http://localhost:5001/*',
  'http://localhost:5002/*',
  'http://localhost:5003/*',
  'http://100.121.134.27:5000/*',
  'http://100.121.134.27:5001/*',
  'http://100.121.134.27:5002/*',
  'http://100.121.134.27:5003/*'
];

function setAllButtonsDisabled(disabled) {
  document.getElementById('captureBtn').disabled = disabled;
  document.getElementById('captureCrBtn').disabled = disabled;
  document.getElementById('updateBtn').disabled = disabled;
  document.getElementById('updateCrBtn').disabled = disabled;
}

async function captureProfile(withCR) {
  const statusEl = document.getElementById('status');
  const resultEl = document.getElementById('result');
  const crCommentEl = document.getElementById('crComment');

  statusEl.textContent = 'Extracting...';
  statusEl.className = '';
  setAllButtonsDisabled(true);
  resultEl.textContent = '';

  // Get comment for CR captures
  const comment = withCR ? (crCommentEl.value || '').trim() : '';

  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Check if on LinkedIn
    if (!tab.url || !tab.url.includes('linkedin.com')) {
      throw new Error('Not on LinkedIn');
    }

    // Inject content script and extract
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    // Get profile data
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractProfile' });

    if (!response || !response.text) {
      throw new Error('Could not extract profile');
    }

    statusEl.textContent = 'Sending to NameApp...';

    // Send to background for API calls
    const result = await chrome.runtime.sendMessage({
      action: 'capture',
      text: response.text,
      url: response.url,
      sourceType: withCR ? 'linkedin_import_cr' : 'linkedin_import',
      comment: comment
    });

    if (result.success) {
      const d = result.data;
      statusEl.textContent = withCR ? 'Captured + CR!' : 'Captured!';
      statusEl.className = 'success';
      resultEl.innerHTML = `
        <strong>${d.first} ${d.last}</strong><br>
        ${d.title || ''} ${d.firm ? '@ ' + d.firm : ''}<br>
        <em>Status: ${d.dupe_status}</em>
        ${d.matched_contact_id ? '<br>Match found: #' + d.matched_contact_id : ''}
        ${withCR ? '<br><strong>+ Connection Request</strong>' : ''}
        ${comment ? '<br><em>Note: ' + comment + '</em>' : ''}
      `;
      // Clear comment field after successful CR capture
      if (withCR) {
        crCommentEl.value = '';
      }
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    statusEl.textContent = 'Error';
    statusEl.className = 'error';
    resultEl.textContent = err.message;
  } finally {
    setAllButtonsDisabled(false);
  }
}

async function updateProfile(withCR) {
  const statusEl = document.getElementById('status');
  const resultEl = document.getElementById('result');
  const crCommentEl = document.getElementById('crComment');

  statusEl.textContent = 'Finding myCRM tab...';
  statusEl.className = '';
  setAllButtonsDisabled(true);
  resultEl.textContent = '';

  // Get comment
  const comment = (crCommentEl.value || '').trim();

  try {
    // Find myCRM tab and ask it for the selected staged contact
    const myCrmTabs = await chrome.tabs.query({ url: MYCRM_URL_PATTERNS });

    if (myCrmTabs.length === 0) {
      throw new Error('No myCRM tab found. Open myCRM first.');
    }

    statusEl.textContent = 'Checking staged contact...';

    // Try each myCRM tab until we get a response
    let stagedContact = null;
    console.log('[NameApp Popup] Found', myCrmTabs.length, 'myCRM tabs');
    for (const myCrmTab of myCrmTabs) {
      try {
        console.log('[NameApp Popup] Asking tab', myCrmTab.id, 'for staged contact');
        const response = await chrome.tabs.sendMessage(myCrmTab.id, { action: 'getStagedContact' });
        console.log('[NameApp Popup] Response from tab:', response);
        if (response && response.success && response.contact && response.contact.id) {
          stagedContact = response.contact;
          console.log('[NameApp Popup] Got staged contact:', stagedContact);
          break;
        }
      } catch (e) {
        console.log('[NameApp Popup] Tab', myCrmTab.id, 'error:', e.message);
        // Tab might not have content script loaded, try next
        continue;
      }
    }

    if (!stagedContact || !stagedContact.id) {
      throw new Error('No staged contact selected. Press Alt+P on a staged contact in myCRM first.');
    }

    // Get active tab (should be LinkedIn)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Check if on LinkedIn
    if (!tab.url || !tab.url.includes('linkedin.com')) {
      throw new Error('Not on LinkedIn profile page');
    }

    statusEl.textContent = 'Extracting profile...';

    // Inject content script and extract
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    // Get profile data
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractProfile' });

    if (!response || !response.text) {
      throw new Error('Could not extract profile');
    }

    statusEl.textContent = 'Parsing profile...';

    // Parse the profile via API
    const parseRes = await fetch(`${API_BASE}/contacts/parse-linkedin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: response.text })
    });

    if (!parseRes.ok) {
      const err = await parseRes.json();
      throw new Error(err.error || 'Parse failed');
    }

    const profileData = await parseRes.json();

    // Build smart merge payload
    // - first/last: only if existing is empty
    // - title/firm/city/state/education: always update from LinkedIn
    // - li_url: always update
    // - comment: set if provided
    // - source_type: set to linkedin_import_cr if CR button used
    const updatePayload = {};

    // Only update first/last if existing is empty
    if (!stagedContact.first && profileData.first) {
      updatePayload.first = profileData.first;
    }
    if (!stagedContact.last && profileData.last) {
      updatePayload.last = profileData.last;
    }

    // Always update these fields from LinkedIn (they reflect current info)
    if (profileData.title) updatePayload.title = profileData.title;
    if (profileData.firm) updatePayload.firm = profileData.firm;
    if (profileData.city) updatePayload.city = profileData.city;
    if (profileData.state) updatePayload.state = profileData.state;
    if (profileData.education) updatePayload.education = profileData.education;

    // Always update LinkedIn URL
    let liUrl = response.url?.trim();
    if (liUrl) {
      if (!/^https?:\/\//i.test(liUrl)) liUrl = 'https://' + liUrl;
      updatePayload.li_url = liUrl;
    }

    // Set comment if provided
    if (comment) {
      updatePayload.comment = comment;
    }

    // Set source_type for CR
    if (withCR) {
      updatePayload.source_type = 'linkedin_import_cr';
    }

    statusEl.textContent = 'Updating staged contact...';

    console.log('[NameApp Popup] Updating staged contact', stagedContact.id, 'with:', updatePayload);

    // Call API directly to update the staged contact
    const updateRes = await fetch(`${API_BASE}/staging/${stagedContact.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload)
    });

    console.log('[NameApp Popup] API response status:', updateRes.status);

    if (!updateRes.ok) {
      const err = await updateRes.json();
      throw new Error(err.error || 'Update failed');
    }

    const updatedContact = await updateRes.json();
    console.log('[NameApp Popup] Updated contact:', updatedContact);

    // Clear the pending staged contact in myCRM localStorage
    for (const myCrmTab of myCrmTabs) {
      try {
        await chrome.tabs.sendMessage(myCrmTab.id, { action: 'clearStagedContact' });
      } catch (e) {
        // Ignore errors
      }
    }

    statusEl.textContent = withCR ? 'Updated + CR!' : 'Updated!';
    statusEl.className = 'success';
    resultEl.innerHTML = `
      <strong>${updatedContact.first || ''} ${updatedContact.last || ''}</strong><br>
      ${updatedContact.title || ''} ${updatedContact.firm ? '@ ' + updatedContact.firm : ''}<br>
      <em>Press <strong>Alt+J</strong> in myCRM to refresh</em>
      ${withCR ? '<br><strong>+ CR flag set</strong>' : ''}
      ${comment ? '<br><em>Note: ' + comment + '</em>' : ''}
    `;
    // Clear comment field
    if (comment) {
      crCommentEl.value = '';
    }

  } catch (err) {
    statusEl.textContent = 'Error';
    statusEl.className = 'error';
    resultEl.textContent = err.message;
  } finally {
    setAllButtonsDisabled(false);
  }
}

document.getElementById('captureBtn').addEventListener('click', () => captureProfile(false));
document.getElementById('captureCrBtn').addEventListener('click', () => captureProfile(true));
document.getElementById('updateBtn').addEventListener('click', () => updateProfile(false));
document.getElementById('updateCrBtn').addEventListener('click', () => updateProfile(true));
