import { createLogger, log, logError, logPerformance } from '@/lib/logger'

describe('Logger utilities', () => {
  let consoleSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    jest.clearAllMocks()
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('createLogger', () => {
    it('should create logger with context', () => {
      const logger = createLogger('test-module')
      expect(logger).toBeDefined()
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.error).toBe('function')
      expect(typeof logger.warn).toBe('function')
    })

    it('should log with context prefix', () => {
      const logger = createLogger('test-module')
      logger.info('Test message')
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[test-module]'),
        expect.any(String)
      )
    })

    it('should log errors with context', () => {
      const logger = createLogger('test-module')
      logger.error('Error message')
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[test-module]'),
        expect.any(String)
      )
    })
  })

  describe('log', () => {
    it('should log info messages', () => {
      log('info', 'Test info message')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('INFO'),
        expect.any(String)
      )
    })

    it('should log warning messages', () => {
      log('warn', 'Test warning message')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('WARN'),
        expect.any(String)
      )
    })

    it('should log error messages', () => {
      log('error', 'Test error message')
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('ERROR'),
        expect.any(String)
      )
    })

    it('should include timestamp in logs', () => {
      log('info', 'Test message')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        expect.any(String)
      )
    })
  })

  describe('logError', () => {
    it('should log error objects', () => {
      const error = new Error('Test error')
      error.stack = 'Error stack trace'
      
      logError('Test context', error)
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test context')
      )
    })

    it('should log string errors', () => {
      logError('Test context', 'String error message')
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test context')
      )
    })

    it('should handle unknown error types', () => {
      logError('Test context', { unknown: 'error' })
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test context')
      )
    })
  })

  describe('logPerformance', () => {
    it('should log performance timing', () => {
      logPerformance('Test operation', 1500)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test operation: 1500ms')
      )
    })

    it('should format timing correctly', () => {
      logPerformance('Fast operation', 50)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Fast operation: 50ms')
      )
    })

    it('should handle zero timing', () => {
      logPerformance('Instant operation', 0)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Instant operation: 0ms')
      )
    })
  })

  describe('production mode', () => {
    const originalEnv = process.env.NODE_ENV

    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })

    afterEach(() => {
      process.env.NODE_ENV = originalEnv
    })

    it('should suppress debug logs in production', () => {
      log('debug', 'Debug message')
      
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('should still log errors in production', () => {
      logError('Production error', new Error('Critical error'))
      
      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })
})