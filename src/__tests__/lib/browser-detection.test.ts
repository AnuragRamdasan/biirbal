import { detectBrowser } from '@/lib/browser-detection';

// Mock window.navigator
const mockNavigator = {
  userAgent: ''
};

Object.defineProperty(window, 'navigator', {
  value: mockNavigator,
  writable: true
});

describe('Browser Detection', () => {
  beforeEach(() => {
    mockNavigator.userAgent = '';
  });

  it('should detect Firefox browser', () => {
    mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0';
    
    const result = detectBrowser();
    
    expect(result.browserName).toBe('Firefox');
    expect(result.storeName).toBe('Firefox Add-ons');
    expect(result.url).toBe('https://addons.mozilla.org/en-US/firefox/addon/biirbal-ai-link-saver/');
  });

  it('should detect Chrome browser', () => {
    mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    
    const result = detectBrowser();
    
    expect(result.browserName).toBe('Chrome');
    expect(result.storeName).toBe('Chrome Store');
    expect(result.url).toBe('https://chromewebstore.google.com/detail/biirbal-link-saver/dadpdioiggioklkffohdcmkmhpjffgae');
  });

  it('should detect Edge browser', () => {
    mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59';
    
    const result = detectBrowser();
    
    expect(result.browserName).toBe('Edge');
    expect(result.storeName).toBe('Chrome Store');
    expect(result.url).toBe('https://chromewebstore.google.com/detail/biirbal-link-saver/dadpdioiggioklkffohdcmkmhpjffgae');
  });

  it('should detect Safari browser', () => {
    mockNavigator.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15';
    
    const result = detectBrowser();
    
    expect(result.browserName).toBe('Safari');
    expect(result.storeName).toBe('Chrome Store');
    expect(result.url).toBe('https://chromewebstore.google.com/detail/biirbal-link-saver/dadpdioiggioklkffohdcmkmhpjffgae');
  });

  it('should fallback to Chrome for unknown browsers', () => {
    mockNavigator.userAgent = 'Unknown Browser/1.0';
    
    const result = detectBrowser();
    
    expect(result.browserName).toBe('Chrome');
    expect(result.storeName).toBe('Chrome Store');
    expect(result.url).toBe('https://chromewebstore.google.com/detail/biirbal-link-saver/dadpdioiggioklkffohdcmkmhpjffgae');
  });

});