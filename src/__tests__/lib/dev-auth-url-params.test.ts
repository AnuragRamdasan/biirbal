import { shouldBypassAuth } from '@/lib/dev-auth';

// Mock environment
const originalNodeEnv = process.env.NODE_ENV;

describe('Dev Auth URL Parameters', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('shouldBypassAuth', () => {
    it('should return false in production', () => {
      process.env.NODE_ENV = 'production';
      const url = new URL('http://localhost:3000?dev=true');
      expect(shouldBypassAuth(url)).toBe(false);
    });

    it('should return false without URL parameter', () => {
      const url = new URL('http://localhost:3000');
      expect(shouldBypassAuth(url)).toBe(false);
    });

    it('should return true with dev=true parameter', () => {
      const url = new URL('http://localhost:3000?dev=true');
      expect(shouldBypassAuth(url)).toBe(true);
    });

    it('should return true with devLogin=true parameter', () => {
      const url = new URL('http://localhost:3000?devLogin=true');
      expect(shouldBypassAuth(url)).toBe(true);
    });

    it('should return false with dev=false parameter', () => {
      const url = new URL('http://localhost:3000?dev=false');
      expect(shouldBypassAuth(url)).toBe(false);
    });

    it('should work with string URLs', () => {
      expect(shouldBypassAuth('http://localhost:3000?dev=true')).toBe(true);
      expect(shouldBypassAuth('http://localhost:3000?devLogin=true')).toBe(true);
      expect(shouldBypassAuth('http://localhost:3000')).toBe(false);
    });

    it('should return false when no URL provided', () => {
      expect(shouldBypassAuth()).toBe(false);
    });

    it('should work with complex URLs', () => {
      const url = new URL('http://localhost:3000/some/path?other=param&dev=true&more=params');
      expect(shouldBypassAuth(url)).toBe(true);
    });
  });
});