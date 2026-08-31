// Content script for myCRM pages
// Responds to extension requests for the currently selected staged contact

const PENDING_STAGED_KEY = 'nameApp_pendingStagedContact';

console.log('[NameApp] Content script loaded on myCRM page');

// Listen for messages from the extension popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[NameApp] Received message:', request.action);

  if (request.action === 'getStagedContact') {
    try {
      const stored = localStorage.getItem(PENDING_STAGED_KEY);
      console.log('[NameApp] localStorage value:', stored);
      if (stored) {
        const data = JSON.parse(stored);
        console.log('[NameApp] Parsed contact:', data);
        sendResponse({ success: true, contact: data });
      } else {
        console.log('[NameApp] No contact in localStorage');
        sendResponse({ success: false, error: 'No contact selected' });
      }
    } catch (e) {
      console.error('[NameApp] Error:', e);
      sendResponse({ success: false, error: 'Error reading contact: ' + e.message });
    }
    return true;
  }

  if (request.action === 'clearStagedContact') {
    console.log('[NameApp] Clearing staged contact');
    localStorage.removeItem(PENDING_STAGED_KEY);
    sendResponse({ success: true });
    return true;
  }
});
