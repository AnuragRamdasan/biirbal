// Content script for Biirbal Chrome Extension
class BiirbalContent {
  constructor() {
    this.init();
  }

  init() {
    // Only run on biirbal.ai to sync authentication
    if (window.location.hostname.includes('biirbal.ai')) {
      this.syncAuthStatus();
    }

    // Add keyboard shortcut for quick save (Ctrl+Shift+B)
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'B') {
        event.preventDefault();
        this.quickSave();
      }
    });
  }

  syncAuthStatus() {
    // Check if user is authenticated on biirbal.ai
    const userId = localStorage.getItem('biirbal_user_id');
    
    // Send auth status to background script
    chrome.runtime.sendMessage({
      type: 'AUTH_STATUS_UPDATE',
      authenticated: !!userId
    });
  }

  async quickSave() {
    try {
      // Show a temporary notification
      this.showNotification('Saving to Biirbal...', 'info');

      // Send save request to background script
      const result = await chrome.runtime.sendMessage({
        type: 'SAVE_LINK',
        data: {
          url: window.location.href,
          title: document.title,
          source: 'chrome-extension-hotkey'
        }
      });

      if (result.success) {
        this.showNotification('Saved to Biirbal!', 'success');
      } else {
        this.showNotification('Failed to save. Please log in to biirbal.ai', 'error');
      }
    } catch (error) {
      console.error('Quick save error:', error);
      this.showNotification('Failed to save to Biirbal', 'error');
    }
  }

  showNotification(message, type) {
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#52c41a' : type === 'error' ? '#ff4d4f' : '#1890ff'};
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      transition: all 0.3s ease;
    `;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}

// Initialize content script
new BiirbalContent();