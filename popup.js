// popup.js
document.addEventListener('DOMContentLoaded', function() {
    // Tab switching functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');
        
        // Update active tab button
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Update active tab content
        tabContents.forEach(content => content.classList.remove('active'));
        document.getElementById(tabName).classList.add('active');
        
        // If switching to saved passwords tab, refresh the list
        if (tabName === 'saved') {
          loadSavedPasswords();
        }
      });
    });
    
    // Password visibility toggle
    const togglePasswordBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    togglePasswordBtn.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      togglePasswordBtn.textContent = type === 'password' ? 'View' : 'Hide';
    });
    
    // Add new password form submission
    const addPasswordForm = document.getElementById('addPasswordForm');
    
    addPasswordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const websiteUrl = document.getElementById('website').value;
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      // Save the password
      savePassword(websiteUrl, username, password);
      
      // Clear the form
      addPasswordForm.reset();
      
      // Switch to saved passwords tab
      tabButtons[0].click();
    });
    
    // Search functionality
    const searchInput = document.getElementById('search');
    
    searchInput.addEventListener('input', () => {
      const searchTerm = searchInput.value.toLowerCase();
      filterPasswordList(searchTerm);
    });
    
    // Initial load of saved passwords
    loadSavedPasswords();
    
    // Function to save a password
    function savePassword(website, username, password) {
      chrome.storage.sync.get('passwords', (data) => {
        const passwords = data.passwords || [];
        
        // Check if entry for this website already exists
        const existingIndex = passwords.findIndex(entry => entry.website === website);
        
        if (existingIndex !== -1) {
          // Update existing entry
          passwords[existingIndex].username = username;
          passwords[existingIndex].password = password;
        } else {
          // Add new entry
          passwords.push({
            id: Date.now().toString(),
            website,
            username,
            password
          });
        }
        
        // Save updated passwords
        chrome.storage.sync.set({ passwords }, () => {
          console.log('Password saved');
        });
      });
    }
    
    // Function to load and display saved passwords
    function loadSavedPasswords() {
      const passwordList = document.getElementById('passwordList');
      
      chrome.storage.sync.get('passwords', (data) => {
        const passwords = data.passwords || [];
        
        passwordList.innerHTML = '';
        
        if (passwords.length === 0) {
          passwordList.innerHTML = '<div class="empty-message">No saved passwords yet</div>';
          return;
        }
        
        passwords.forEach(entry => {
          const passwordItem = document.createElement('div');
          passwordItem.classList.add('password-item');
          passwordItem.setAttribute('data-id', entry.id);
          
          const domain = new URL(entry.website).hostname;
          
          passwordItem.innerHTML = `
            <h3>${domain}</h3>
            <p><strong>Username:</strong> ${entry.username}</p>
            <p><strong>Password:</strong> ${'•'.repeat(8)}</p>
            <div class="password-actions">
              <button class="action-btn view-btn">View</button>
              <button class="action-btn copy-btn">Copy</button>
              <button class="action-btn delete-btn">Delete</button>
            </div>
          `;
          
          passwordList.appendChild(passwordItem);
        });
        
        // Add event listeners for password actions
        addPasswordActionListeners();
      });
    }
    
    // Function to filter password list based on search term
    function filterPasswordList(searchTerm) {
      const passwordItems = document.querySelectorAll('.password-item');
      
      passwordItems.forEach(item => {
        const website = item.querySelector('h3').textContent.toLowerCase();
        const username = item.querySelector('p').textContent.toLowerCase();
        
        if (website.includes(searchTerm) || username.includes(searchTerm)) {
          item.style.display = 'block';
        } else {
          item.style.display = 'none';
        }
      });
    }
    
    // Function to add event listeners for password actions
    function addPasswordActionListeners() {
      // View password
      const viewButtons = document.querySelectorAll('.view-btn');
      viewButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          const passwordItem = e.target.closest('.password-item');
          const id = passwordItem.getAttribute('data-id');
          
          chrome.storage.sync.get('passwords', (data) => {
            const passwords = data.passwords || [];
            const entry = passwords.find(entry => entry.id === id);
            
            if (entry) {
              const passwordField = passwordItem.querySelectorAll('p')[1];
              
              if (passwordField.textContent.includes('•')) {
                passwordField.innerHTML = `<strong>Password:</strong> ${entry.password}`;
                button.textContent = 'Hide';
              } else {
                passwordField.innerHTML = `<strong>Password:</strong> ${'•'.repeat(8)}`;
                button.textContent = 'View';
              }
            }
          });
        });
      });
      
      // Copy password
      const copyButtons = document.querySelectorAll('.copy-btn');
      copyButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          const passwordItem = e.target.closest('.password-item');
          const id = passwordItem.getAttribute('data-id');
          
          chrome.storage.sync.get('passwords', (data) => {
            const passwords = data.passwords || [];
            const entry = passwords.find(entry => entry.id === id);
            
            if (entry) {
              navigator.clipboard.writeText(entry.password).then(() => {
                const originalText = button.textContent;
                button.textContent = 'Copied!';
                setTimeout(() => {
                  button.textContent = originalText;
                }, 1500);
              });
            }
          });
        });
      });
      
      // Delete password
      const deleteButtons = document.querySelectorAll('.delete-btn');
      deleteButtons.forEach(button => {
        button.addEventListener('click', (e) => {
          const passwordItem = e.target.closest('.password-item');
          const id = passwordItem.getAttribute('data-id');
          
          chrome.storage.sync.get('passwords', (data) => {
            let passwords = data.passwords || [];
            passwords = passwords.filter(entry => entry.id !== id);
            
            chrome.storage.sync.set({ passwords }, () => {
              passwordItem.remove();
              
              if (passwords.length === 0) {
                document.getElementById('passwordList').innerHTML = 
                  '<div class="empty-message">No saved passwords yet</div>';
              }
            });
          });
        });
      });
    }
  });