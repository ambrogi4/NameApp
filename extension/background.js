const API_BASE = 'http://100.121.134.27:5000/api';

async function captureToStaging(profileText, profileUrl) {
  // Step 1: Parse with Claude
  const parseRes = await fetch(`${API_BASE}/contacts/parse-linkedin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: profileText })
  });

  if (!parseRes.ok) {
    const err = await parseRes.json();
    throw new Error(err.error || 'Parse failed');
  }

  const parsed = await parseRes.json();

  // Step 2: Create staged contact
  const stagingData = {
    ...parsed,
    li_url: profileUrl,
    source_type: 'linkedin_import'
  };

  const stagingRes = await fetch(`${API_BASE}/staging`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stagingData)
  });

  if (!stagingRes.ok) {
    const err = await stagingRes.json();
    throw new Error(err.error || 'Staging failed');
  }

  return stagingRes.json();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'capture') {
    captureToStaging(request.text, request.url)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Async response
  }
});
