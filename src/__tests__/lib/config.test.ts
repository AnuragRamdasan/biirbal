import { getBaseUrl, isProduction, isDevelopment } from '@/lib/config'

describe('Config utilities', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('getBaseUrl', () => {
    it('should return NEXTAUTH_URL when set', () => {
      process.env.NEXTAUTH_URL = 'https://custom.example.com'
      const url = getBaseUrl()
      expect(url).toBe('https://custom.example.com')
    })

    it('should return localhost for development', () => {
      delete process.env.NEXTAUTH_URL
      process.env.NODE_ENV = 'development'
      const url = getBaseUrl()
      expect(url).toBe('http://localhost:3000')
    })

    it('should return production URL when in production', () => {
      delete process.env.NEXTAUTH_URL
      process.env.NODE_ENV = 'production'
      const url = getBaseUrl()
      expect(url).toBe('https://www.biirbal.com')
    })
  })

  describe('isProduction', () => {
    it('should return true when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production'
      expect(isProduction()).toBe(true)
    })

    it('should return false when NODE_ENV is not production', () => {
      process.env.NODE_ENV = 'development'
      expect(isProduction()).toBe(false)
    })

    it('should return false when NODE_ENV is undefined', () => {
      delete process.env.NODE_ENV
      expect(isProduction()).toBe(false)
    })
  })

  describe('isDevelopment', () => {
    it('should return true when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development'
      expect(isDevelopment()).toBe(true)
    })

    it('should return false when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production'
      expect(isDevelopment()).toBe(false)
    })

    it('should return true when NODE_ENV is undefined (default)', () => {
      delete process.env.NODE_ENV
      expect(isDevelopment()).toBe(true)
    })
  })
})