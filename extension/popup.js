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

    // Check if there's a pending staged contact from Alt+P workflow
    // If so, update that record instead of creating a new one
    let pendingStagedContact = null;
    const myCrmTabs = await chrome.tabs.query({ url: MYCRM_URL_PATTERNS });

    for (const myCrmTab of myCrmTabs) {
      try {
        const response = await chrome.tabs.sendMessage(myCrmTab.id, { action: 'getStagedContact' });
        if (response && response.success && response.contact && response.contact.id) {
          pendingStagedContact = response.contact;
          console.log('[NameApp Popup] Found pending staged contact:', pendingStagedContact);
          break;
        }
      } catch (e) {
        // Tab might not have content script loaded, try next
        continue;
      }
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

    // If we have a pending staged contact, UPDATE it instead of creating new
    if (pendingStagedContact && pendingStagedContact.id) {
      statusEl.textContent = 'Updating staged contact...';

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

      // Build smart merge payload (same logic as updateProfile)
      const updatePayload = {};

      // Only update first/last if existing is empty
      if (!pendingStagedContact.first && profileData.first) {
        updatePayload.first = profileData.first;
      }
      if (!pendingStagedContact.last && profileData.last) {
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

      // Call API to update the staged contact
      const updateRes = await fetch(`${API_BASE}/staging/${pendingStagedContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      if (!updateRes.ok) {
        const err = await updateRes.json();
        throw new Error(err.error || 'Update failed');
      }

      const updatedContact = await updateRes.json();

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
        <em>Updated existing staged record #${updatedContact.id}</em>
        ${withCR ? '<br><strong>+ CR flag set</strong>' : ''}
        ${comment ? '<br><em>Note: ' + comment + '</em>' : ''}
        <br><em>Press <strong>Alt+J</strong> in myCRM to refresh</em>
      `;
      if (withCR || comment) {
        crCommentEl.value = '';
      }
    } else {
      // No pending staged contact - create new (original behavior)
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
