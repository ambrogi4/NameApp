// Extract visible text from LinkedIn profile
function extractProfileText() {
  // Get main content area (avoid nav, ads, sidebar)
  const main = document.querySelector('main') || document.body;
  return main.innerText.substring(0, 12000); // API limit
}

// Listen for message from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractProfile') {
    const text = extractProfileText();
    const url = window.location.href;
    sendResponse({ text, url });
  }
  return true; // Keep channel open for async
});
