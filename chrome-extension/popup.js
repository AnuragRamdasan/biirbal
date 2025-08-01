// Popup script for Biirbal Chrome Extension
class BiirbalExtension {
  constructor() {
    this.baseUrl = 'https://biirbal.ai';
    this.currentTab = null;
    this.currentUser = null;
    this.teams = [];
    
    this.init();
  }

  async init() {
    try {
      // Get current tab info
      await this.getCurrentTab();
      
      // Check authentication
      await this.checkAuth();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Load teams if authenticated
      if (this.currentUser) {
        await this.loadTeams();
      }
    } catch (error) {
      console.error('Extension initialization error:', error);
      this.showError('Failed to initialize extension');
    }
  }

  async getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tab;
    
    // Update UI with current page info
    document.getElementById('page-title').textContent = tab.title || 'Untitled Page';
    document.getElementById('page-url').textContent = tab.url;
  }

  async checkAuth() {
    try {
      // Try to get auth from cookies
      const cookies = await chrome.cookies.getAll({
        domain: '.biirbal.ai'
      });
      
      // Look for session cookie
      const sessionCookie = cookies.find(cookie => 
        cookie.name.includes('session') || 
        cookie.name.includes('auth') ||
        cookie.name === '__Secure-next-auth.session-token'
      );

      if (!sessionCookie) {
        this.showAuthSection();
        return;
      }

      // Try to verify auth with API
      const response = await fetch(`${this.baseUrl}/api/profile`, {
        credentials: 'include',
        headers: {
          'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; ')
        }
      });

      if (response.ok) {
        const userData = await response.json();
        this.currentUser = userData;
        this.showMainSection();
      } else {
        this.showAuthSection();
      }
    } catch (error) {
      console.error('Auth check error:', error);
      this.showAuthSection();
    }
  }

  async loadTeams() {
    try {
      const response = await fetch(`${this.baseUrl}/api/team/members`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        this.teams = Array.isArray(data) ? data : [data];
        this.populateTeamSelect();
      } else {
        this.showError('Failed to load teams');
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
      this.showError('Failed to load teams');
    }
  }

  populateTeamSelect() {
    const select = document.getElementById('team-select');
    select.innerHTML = '';

    if (this.teams.length === 0) {
      select.innerHTML = '<option value="" disabled>No teams found</option>';
      return;
    }

    // If user has teams, populate them
    this.teams.forEach(team => {
      const option = document.createElement('option');
      option.value = team.slackTeamId || team.id;
      option.textContent = team.teamName || 'Unnamed Team';
      select.appendChild(option);
    });

    // Select first team by default
    if (this.teams.length > 0) {
      select.selectedIndex = 0;
      document.getElementById('save-btn').disabled = false;
    }
  }

  setupEventListeners() {
    // Login button
    document.getElementById('login-btn').addEventListener('click', () => {
      chrome.tabs.create({ url: this.baseUrl });
      window.close();
    });

    // Save button
    document.getElementById('save-btn').addEventListener('click', () => {
      this.saveLink();
    });

    // Open dashboard button
    document.getElementById('open-dashboard').addEventListener('click', () => {
      chrome.tabs.create({ url: `${this.baseUrl}/dashboard` });
      window.close();
    });
  }

  async saveLink() {
    const saveBtn = document.getElementById('save-btn');
    const teamSelect = document.getElementById('team-select');
    
    if (!teamSelect.value) {
      this.showError('Please select a team');
      return;
    }

    try {
      // Disable button and show loading state
      saveBtn.disabled = true;

      // Prepare link data
      const linkData = {
        url: this.currentTab.url,
        title: this.currentTab.title,
        teamId: teamSelect.value,
        source: 'chrome-extension'
      };

      // Send to API
      const response = await fetch(`${this.baseUrl}/api/extension/save-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(linkData)
      });

      if (response.ok) {
        this.showSuccess('Link saved successfully! Processing will begin shortly.');
        
        // Close popup after 2 seconds
        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        const error = await response.text();
        this.showError(`Failed to save link: ${error}`);
      }
    } catch (error) {
      console.error('Save link error:', error);
      this.showError('Failed to save link. Please try again.');
    } finally {
      saveBtn.disabled = false;
    }
  }

  showAuthSection() {
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('main-section').style.display = 'none';
  }

  showMainSection() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('main-section').style.display = 'block';
  }

  showMessage(message, type) {
    const statusDiv = document.getElementById('status-message');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.style.display = 'block';

    // Hide after 5 seconds for success/error messages
    if (type !== 'info') {
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 5000);
    }
  }

  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  showError(message) {
    this.showMessage(message, 'error');
  }

  showInfo(message) {
    this.showMessage(message, 'info');
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new BiirbalExtension();
});