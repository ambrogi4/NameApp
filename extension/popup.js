document.getElementById('captureBtn').addEventListener('click', async () => {
  const statusEl = document.getElementById('status');
  const resultEl = document.getElementById('result');
  const btn = document.getElementById('captureBtn');

  statusEl.textContent = 'Extracting...';
  statusEl.className = '';
  btn.disabled = true;
  resultEl.textContent = '';

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
      url: response.url
    });

    if (result.success) {
      const d = result.data;
      statusEl.textContent = 'Captured!';
      statusEl.className = 'success';
      resultEl.innerHTML = `
        <strong>${d.first} ${d.last}</strong><br>
        ${d.title || ''} ${d.firm ? '@ ' + d.firm : ''}<br>
        <em>Status: ${d.dupe_status}</em>
        ${d.matched_contact_id ? '<br>Match found: #' + d.matched_contact_id : ''}
      `;
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    statusEl.textContent = 'Error';
    statusEl.className = 'error';
    resultEl.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});
