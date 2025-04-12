// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log('SecurePass Manager installed');
  // Initialize the password storage if it doesn't exist
  chrome.storage.sync.get('passwords', (data) => {
    if (!data.passwords) {
      chrome.storage.sync.set({ passwords: [] });
    }
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message);
  
  if (message.action === 'getCredentials') {
    chrome.storage.sync.get('passwords', (data) => {
      console.log('Sending credentials to content script:', data.passwords?.length || 0);
      sendResponse({ credentials: data.passwords || [] });
    });
    return true; // Required for async response
  }
});