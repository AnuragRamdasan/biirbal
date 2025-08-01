// Background script for Biirbal Chrome Extension
class BiirbalBackground {
  constructor() {
    this.baseUrl = 'https://biirbal.ai';
    this.init();
  }

  init() {
    // Set up extension event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Handle installation
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        // Open welcome page
        chrome.tabs.create({ 
          url: `${this.baseUrl}?welcome=extension` 
        });
      }
    });

    // Handle context menu (optional future feature)
    chrome.runtime.onInstalled.addListener(() => {
      chrome.contextMenus.create({
        id: 'saveToBiirbal',
        title: 'Save to Biirbal',
        contexts: ['page', 'link']
      });
    });

    // Handle context menu clicks
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === 'saveToBiirbal') {
        this.handleContextMenuSave(info, tab);
      }
    });

    // Handle tab updates to check for biirbal.ai authentication
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && 
          tab.url && 
          tab.url.includes('biirbal.ai')) {
        this.handleBiirbalPageLoad(tab);
      }
    });

    // Handle messages from content script or popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep the message channel open for async responses
    });
  }

  async handleContextMenuSave(info, tab) {
    try {
      // Get the URL to save (either the link or the page)
      const urlToSave = info.linkUrl || tab.url;
      const titleToSave = info.linkUrl ? info.selectionText || 'Link' : tab.title;

      // Check if user is authenticated
      const isAuthenticated = await this.checkAuthentication();
      
      if (!isAuthenticated) {
        // Show notification to log in
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Biirbal Extension',
          message: 'Please log in to biirbal.ai first'
        });
        
        // Open biirbal.ai
        chrome.tabs.create({ url: this.baseUrl });
        return;
      }

      // Try to save the link
      const result = await this.saveLink({
        url: urlToSave,
        title: titleToSave,
        source: 'chrome-extension-context'
      });

      if (result.success) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Biirbal Extension',
          message: 'Link saved successfully!'
        });
      } else {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Biirbal Extension',
          message: 'Failed to save link. Please try again.'
        });
      }
    } catch (error) {
      console.error('Context menu save error:', error);
    }
  }

  async handleBiirbalPageLoad(tab) {
    // Inject a script to check authentication status
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          // Send authentication status back to background script
          chrome.runtime.sendMessage({
            type: 'AUTH_STATUS_UPDATE',
            authenticated: !!localStorage.getItem('biirbal_user_id')
          });
        }
      });
    } catch (error) {
      console.error('Failed to check auth status:', error);
    }
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.type) {
        case 'CHECK_AUTH':
          const isAuth = await this.checkAuthentication();
          sendResponse({ authenticated: isAuth });
          break;

        case 'SAVE_LINK':
          const result = await this.saveLink(request.data);
          sendResponse(result);
          break;

        case 'GET_TEAMS':
          const teams = await this.getTeams();
          sendResponse(teams);
          break;

        case 'AUTH_STATUS_UPDATE':
          // Store auth status
          await chrome.storage.local.set({
            authenticated: request.authenticated
          });
          break;

        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Message handling error:', error);
      sendResponse({ error: error.message });
    }
  }

  async checkAuthentication() {
    try {
      // Get cookies from biirbal.ai
      const cookies = await chrome.cookies.getAll({
        domain: '.biirbal.ai'
      });

      // Look for session cookie
      const sessionCookie = cookies.find(cookie => 
        cookie.name.includes('session') || 
        cookie.name.includes('auth') ||
        cookie.name === '__Secure-next-auth.session-token'
      );

      return !!sessionCookie;
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  }

  async saveLink(linkData) {
    try {
      const response = await fetch(`${this.baseUrl}/api/extension/save-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(linkData)
      });

      if (response.ok) {
        return { success: true };
      } else {
        const error = await response.text();
        return { success: false, error };
      }
    } catch (error) {
      console.error('Save link error:', error);
      return { success: false, error: error.message };
    }
  }

  async getTeams() {
    try {
      const response = await fetch(`${this.baseUrl}/api/team/members`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, teams: Array.isArray(data) ? data : [data] };
      } else {
        return { success: false, error: 'Failed to load teams' };
      }
    } catch (error) {
      console.error('Get teams error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Initialize background script
new BiirbalBackground();