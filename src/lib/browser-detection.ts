export interface ExtensionInfo {
  url: string;
  storeName: string;
  browserName: string;
}

export function detectBrowser(): ExtensionInfo {
  if (typeof window === 'undefined') {
    // Server-side fallback
    return {
      url: 'https://chromewebstore.google.com/detail/biirbal-link-saver/dadpdioiggioklkffohdcmkmhpjffgae',
      storeName: 'Chrome Store',
      browserName: 'Chrome'
    };
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  
  // Firefox detection
  if (userAgent.includes('firefox')) {
    return {
      url: 'https://addons.mozilla.org/en-US/firefox/addon/biirbal-ai-link-saver/',
      storeName: 'Firefox Add-ons',
      browserName: 'Firefox'
    };
  }
  
  // Edge detection
  if (userAgent.includes('edg/')) {
    return {
      url: 'https://chromewebstore.google.com/detail/biirbal-link-saver/dadpdioiggioklkffohdcmkmhpjffgae',
      storeName: 'Chrome Store',
      browserName: 'Edge'
    };
  }
  
  // Safari detection
  if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    return {
      url: 'https://chromewebstore.google.com/detail/biirbal-link-saver/dadpdioiggioklkffohdcmkmhpjffgae',
      storeName: 'Chrome Store',
      browserName: 'Safari'
    };
  }
  
  // Chrome and other Chromium-based browsers (default)
  return {
    url: 'https://chromewebstore.google.com/detail/biirbal-link-saver/dadpdioiggioklkffohdcmkmhpjffgae',
    storeName: 'Chrome Store',
    browserName: 'Chrome'
  };
}