// content.js - Fixed version to prevent popup from repeatedly appearing
// This script runs on webpages to detect login forms and offer saved credentials

let credentialSuggestions = null;
let suggestionsClosed = false; // Flag to track if user closed the suggestions

// Function to detect login forms on the page
function detectLoginForms() {
  // Skip if user has already closed the suggestions
  if (suggestionsClosed) {
    return;
  }
  
  console.log('SecurePass: Scanning for login forms...');
  
  // Look for password fields
  const passwordFields = document.querySelectorAll('input[type="password"]');
  
  if (passwordFields.length > 0) {
    console.log(`SecurePass: Found ${passwordFields.length} password fields`);
    
    // For each password field, find its associated form and username field
    passwordFields.forEach(passwordField => {
      const form = passwordField.closest('form');
      
      if (form) {
        // Try multiple selectors to find username/email field
        const possibleUsernameSelectors = [
          'input[type="text"]', 
          'input[type="email"]', 
          'input[name="username"]', 
          'input[name="email"]',
          'input[name="user"]',
          'input[name="login"]',
          'input[id*="username"]', 
          'input[id*="email"]',
          'input[id*="user"]',
          'input[id*="login"]',
          'input[class*="username"]', 
          'input[class*="email"]',
          'input[class*="user"]',
          'input[class*="login"]'
        ];
        
        // Try to find the username field using our selectors
        let usernameField = null;
        for (const selector of possibleUsernameSelectors) {
          const fields = form.querySelectorAll(selector);
          // Take the first visible field that comes before the password field
          for (const field of fields) {
            if (field.offsetParent !== null && !field.disabled && 
                field !== passwordField && 
                field.compareDocumentPosition(passwordField) & Node.DOCUMENT_POSITION_FOLLOWING) {
              usernameField = field;
              break;
            }
          }
          if (usernameField) break;
        }
        
        // If we still can't find it, take the input before the password field
        if (!usernameField) {
          const inputs = form.querySelectorAll('input:not([type="password"]):not([type="hidden"])');
          for (const input of inputs) {
            if (input.offsetParent !== null && !input.disabled && 
                input.compareDocumentPosition(passwordField) & Node.DOCUMENT_POSITION_FOLLOWING) {
              usernameField = input;
              break;
            }
          }
        }
        
        if (usernameField) {
          console.log('SecurePass: Found a login form with username and password fields');
          // Found a login form, check for saved credentials
          if (!suggestionsClosed) {
            checkForCredentials(form, usernameField, passwordField);
          }
        } else {
          console.log('SecurePass: Found a password field but could not locate a username field');
        }
      }
    });
  } else {
    console.log('SecurePass: No password fields found on this page');
  }
}

// Function to check if we have saved credentials for this website
function checkForCredentials(form, usernameField, passwordField) {
  const currentUrl = window.location.href;
  const domain = window.location.hostname;
  
  console.log(`SecurePass: Checking for credentials for domain: ${domain}`);
  
  // Send a message to the background script to get credentials
  chrome.runtime.sendMessage({ action: 'getCredentials' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('SecurePass Error:', chrome.runtime.lastError);
      return;
    }
    
    if (!response || !response.credentials) {
      console.log('SecurePass: No credentials received from background script');
      return;
    }
    
    const passwords = response.credentials;
    console.log(`SecurePass: Got ${passwords.length} saved credentials`);
    
    // Filter passwords that match the current domain
    const matchingCredentials = passwords.filter(entry => {
      try {
        const entryDomain = new URL(entry.website).hostname;
        return domain.includes(entryDomain) || entryDomain.includes(domain);
      } catch (e) {
        console.error('SecurePass Error parsing URL:', e);
        return false;
      }
    });
    
    console.log(`SecurePass: Found ${matchingCredentials.length} matching credentials for this site`);
    
    if (matchingCredentials.length > 0 && !suggestionsClosed) {
      // Display credential suggestions
      showCredentialSuggestions(matchingCredentials, form, usernameField, passwordField);
    }
  });
}

// Function to show credential suggestions
function showCredentialSuggestions(credentials, form, usernameField, passwordField) {
  // If suggestions are closed by user, don't show again
  if (suggestionsClosed) {
    return;
  }
  
  // Remove existing suggestions if there are any
  if (credentialSuggestions) {
    credentialSuggestions.remove();
    credentialSuggestions = null;
  }
  
  // Create credential suggestions element
  credentialSuggestions = document.createElement('div');
  credentialSuggestions.className = 'securepass-suggestions';
  document.body.appendChild(credentialSuggestions);
  
  // Position the suggestions near the username field
  const rect = usernameField.getBoundingClientRect();
  credentialSuggestions.style.top = (window.scrollY + rect.bottom + 5) + 'px';
  credentialSuggestions.style.left = (window.scrollX + rect.left) + 'px';
  
  // Create the suggestion content
  const headerDiv = document.createElement('div');
  headerDiv.className = 'securepass-header';
  
  const logoDiv = document.createElement('div');
  logoDiv.className = 'securepass-logo';
  logoDiv.textContent = 'SecurePass';
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'securepass-close-btn';
  closeBtn.textContent = '×';
  closeBtn.type = 'button';
  
  headerDiv.appendChild(logoDiv);
  headerDiv.appendChild(closeBtn);
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'securepass-content';
  
  const contentP = document.createElement('p');
  contentP.textContent = 'Saved credentials found for this site:';
  
  const credentialsList = document.createElement('div');
  credentialsList.className = 'securepass-credentials-list';
  
  contentDiv.appendChild(contentP);
  contentDiv.appendChild(credentialsList);
  
  credentialSuggestions.appendChild(headerDiv);
  credentialSuggestions.appendChild(contentDiv);
  
  // Add each credential as a button
  credentials.forEach(cred => {
    const credButton = document.createElement('button');
    credButton.className = 'securepass-credential-btn';
    credButton.type = 'button';
    
    const usernameSpan = document.createElement('span');
    usernameSpan.className = 'securepass-username';
    usernameSpan.textContent = cred.username;
    
    credButton.appendChild(usernameSpan);
    
    credButton.addEventListener('click', () => {
      console.log('SecurePass: Filling credentials for', cred.username);
      
      // Fill the fields with our saved credentials
      fillCredentials(usernameField, passwordField, cred.username, cred.password);
      
      // Hide the suggestions and mark as closed
      credentialSuggestions.style.display = 'none';
      suggestionsClosed = true;
    });
    
    credentialsList.appendChild(credButton);
  });
  
  // Add close button functionality with a direct event listener
  closeBtn.addEventListener('click', function(e) {
    console.log('SecurePass: Close button clicked');
    e.stopPropagation(); // Prevent event bubbling
    if (credentialSuggestions) {
      credentialSuggestions.style.display = 'none';
      
      // Set the flag to prevent suggestions from appearing again until page refresh
      suggestionsClosed = true;
    }
  });
  
  // Also close suggestions when clicking outside
  document.addEventListener('click', function(e) {
    if (credentialSuggestions && !credentialSuggestions.contains(e.target)) {
      credentialSuggestions.style.display = 'none';
      suggestionsClosed = true;
    }
  });
  
  // Show the suggestions
  credentialSuggestions.style.display = 'block';
}

// More robust function to fill in credentials
function fillCredentials(usernameField, passwordField, username, password) {
  try {
    // Both direct assignment and input events
    fillField(usernameField, username);
    fillField(passwordField, password);
    
    console.log('SecurePass: Credentials filled successfully');
  } catch (e) {
    console.error('SecurePass: Error filling credentials:', e);
  }
}

// Helper function to fill a field and trigger all necessary events
function fillField(field, value) {
  // Save original properties
  const originalValue = field.value;
  const originalReadOnly = field.readOnly;
  
  // Make field editable if it's readonly
  if (field.readOnly) {
    field.readOnly = false;
  }
  
  // Set the value directly
  field.value = value;
  
  // Trigger events that might be listened for by the page
  const events = [
    new Event('input', { bubbles: true }),
    new Event('change', { bubbles: true }),
    new KeyboardEvent('keydown', { bubbles: true }),
    new KeyboardEvent('keypress', { bubbles: true }),
    new KeyboardEvent('keyup', { bubbles: true })
  ];
  
  events.forEach(event => field.dispatchEvent(event));
  
  // Restore original readonly state
  if (originalReadOnly) {
    field.readOnly = originalReadOnly;
  }
}

// Reset the suggestionsClosed flag when specific user interactions happen
function resetSuggestionsClosed() {
  // If user focuses on a username or password field, we can show suggestions again
  const fields = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], input[name="username"], input[name="email"]');
  fields.forEach(field => {
    field.addEventListener('focus', () => {
      if (suggestionsClosed) {
        suggestionsClosed = false;
        // After resetting the flag, we can check for credentials again
        setTimeout(detectLoginForms, 100);
      }
    });
  });
}

// Run detection when page loads and also after a short delay
window.addEventListener('load', () => {
  // First attempt immediately after load
  detectLoginForms();
  
  // Second attempt after a delay to catch dynamically loaded forms
  setTimeout(detectLoginForms, 1000);
  
  // Setup event listeners to reset the suggestionsClosed flag
  resetSuggestionsClosed();
});

// Also listen for dynamic changes that might add forms
const observer = new MutationObserver(mutations => {
  if (suggestionsClosed) {
    return; // Skip if suggestions are closed
  }
  
  let shouldCheck = false;
  
  for (const mutation of mutations) {
    if (mutation.addedNodes.length) {
      shouldCheck = true;
      break;
    }
  }
  
  if (shouldCheck) {
    // Add a small delay to let the DOM settle
    setTimeout(detectLoginForms, 500);
  }
});

// Start observing
observer.observe(document.body, { childList: true, subtree: true });

// Also check forms when the page visibility changes (e.g., tab becomes active)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !suggestionsClosed) {
    setTimeout(detectLoginForms, 500);
  }
});