async function captureProfile(withCR) {
  const statusEl = document.getElementById('status');
  const resultEl = document.getElementById('result');
  const captureBtn = document.getElementById('captureBtn');
  const captureCrBtn = document.getElementById('captureCrBtn');
  const crCommentEl = document.getElementById('crComment');

  statusEl.textContent = 'Extracting...';
  statusEl.className = '';
  captureBtn.disabled = true;
  captureCrBtn.disabled = true;
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
    captureBtn.disabled = false;
    captureCrBtn.disabled = false;
  }
}

document.getElementById('captureBtn').addEventListener('click', () => captureProfile(false));
document.getElementById('captureCrBtn').addEventListener('click', () => captureProfile(true));
