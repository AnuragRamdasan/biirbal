import {
  handleError,
  createErrorResponse,
  isRetryableError,
  ErrorHandler,
  validateRequired,
  validateEmail,
  validateUrl
} from '@/lib/error-handler'

describe('Error Handler utilities', () => {
  let consoleSpy: jest.SpyInstance

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    jest.clearAllMocks()
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  describe('handleError', () => {
    it('should handle Error objects', () => {
      const error = new Error('Test error message')
      const result = handleError(error, 'test-context')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Test error message')
      expect(result.context).toBe('test-context')
      expect(consoleSpy).toHaveBeenCalled()
    })

    it('should handle string errors', () => {
      const result = handleError('String error message', 'test-context')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('String error message')
      expect(result.context).toBe('test-context')
    })

    it('should handle unknown error types', () => {
      const unknownError = { custom: 'error object' }
      const result = handleError(unknownError, 'test-context')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error occurred')
      expect(result.context).toBe('test-context')
    })

    it('should include stack trace for Error objects', () => {
      const error = new Error('Test error')
      error.stack = 'Error stack trace'
      
      const result = handleError(error, 'test-context')
      
      expect(result.stack).toBe('Error stack trace')
    })

    it('should handle errors without context', () => {
      const error = new Error('Test error')
      const result = handleError(error)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Test error')
      expect(result.context).toBeUndefined()
    })
  })

  describe('createErrorResponse', () => {
    it('should create error response with message', () => {
      const response = createErrorResponse('Error message', 400)
      
      expect(response.status).toBe(400)
      
      // Test response body
      response.json().then(data => {
        expect(data.success).toBe(false)
        expect(data.error).toBe('Error message')
      })
    })

    it('should use default status code', () => {
      const response = createErrorResponse('Error message')
      
      expect(response.status).toBe(500)
    })

    it('should include additional details', () => {
      const response = createErrorResponse('Error message', 400, {
        details: 'Additional error details',
        code: 'VALIDATION_ERROR'
      })
      
      response.json().then(data => {
        expect(data.details).toBe('Additional error details')
        expect(data.code).toBe('VALIDATION_ERROR')
      })
    })

    it('should handle Error objects', () => {
      const error = new Error('Test error')
      const response = createErrorResponse(error, 500)
      
      response.json().then(data => {
        expect(data.error).toBe('Test error')
      })
    })
  })

  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      const networkError = new Error('Network timeout')
      networkError.name = 'NetworkError'
      
      expect(isRetryableError(networkError)).toBe(true)
    })

    it('should identify timeout errors as retryable', () => {
      const timeoutError = new Error('Request timeout')
      
      expect(isRetryableError(timeoutError)).toBe(true)
    })

    it('should identify rate limit errors as retryable', () => {
      const rateLimitError = new Error('Rate limit exceeded')
      
      expect(isRetryableError(rateLimitError)).toBe(true)
    })

    it('should identify 503 errors as retryable', () => {
      const serviceError = new Error('Service unavailable')
      // @ts-ignore - adding status property for test
      serviceError.status = 503
      
      expect(isRetryableError(serviceError)).toBe(true)
    })

    it('should not identify validation errors as retryable', () => {
      const validationError = new Error('Invalid input')
      
      expect(isRetryableError(validationError)).toBe(false)
    })

    it('should not identify 404 errors as retryable', () => {
      const notFoundError = new Error('Not found')
      // @ts-ignore - adding status property for test
      notFoundError.status = 404
      
      expect(isRetryableError(notFoundError)).toBe(false)
    })

    it('should handle non-Error objects', () => {
      expect(isRetryableError('string error')).toBe(false)
      expect(isRetryableError({ custom: 'error' })).toBe(false)
    })
  })

  describe('ErrorHandler class', () => {
    it('should create error handler instance', () => {
      const handler = new ErrorHandler('test-context')
      expect(handler).toBeDefined()
    })

    it('should handle errors with context', () => {
      const handler = new ErrorHandler('test-context')
      const error = new Error('Test error')
      
      const result = handler.handle(error)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Test error')
      expect(result.context).toBe('test-context')
    })

    it('should track error count', () => {
      const handler = new ErrorHandler('test-context')
      
      handler.handle(new Error('Error 1'))
      handler.handle(new Error('Error 2'))
      handler.handle(new Error('Error 3'))
      
      expect(handler.getErrorCount()).toBe(3)
    })

    it('should reset error count', () => {
      const handler = new ErrorHandler('test-context')
      
      handler.handle(new Error('Error 1'))
      handler.handle(new Error('Error 2'))
      
      expect(handler.getErrorCount()).toBe(2)
      
      handler.reset()
      
      expect(handler.getErrorCount()).toBe(0)
    })

    it('should get recent errors', () => {
      const handler = new ErrorHandler('test-context')
      
      handler.handle(new Error('Error 1'))
      handler.handle(new Error('Error 2'))
      handler.handle(new Error('Error 3'))
      
      const recentErrors = handler.getRecentErrors()
      
      expect(recentErrors).toHaveLength(3)
      expect(recentErrors[0].error).toBe('Error 1')
      expect(recentErrors[2].error).toBe('Error 3')
    })

    it('should limit recent errors to maximum count', () => {
      const handler = new ErrorHandler('test-context', 2)
      
      handler.handle(new Error('Error 1'))
      handler.handle(new Error('Error 2'))
      handler.handle(new Error('Error 3'))
      
      const recentErrors = handler.getRecentErrors()
      
      expect(recentErrors).toHaveLength(2)
      expect(recentErrors[0].error).toBe('Error 2')
      expect(recentErrors[1].error).toBe('Error 3')
    })
  })
})

describe('Validation utilities', () => {
  describe('validateRequired', () => {
    it('should throw when required fields are missing', () => {
      expect(() => validateRequired({ a: 1, b: undefined })).toThrow(
        'Missing required fields: b'
      )
    })

    it('should not throw when all required fields are present', () => {
      expect(() => validateRequired({ a: 1, b: 'value', c: 0 })).not.toThrow()
    })
  })

  describe('validateEmail', () => {
    it('should return true for valid email', () => {
      expect(validateEmail('test@example.com')).toBe(true)
    })

    it('should return false for invalid email', () => {
      expect(validateEmail('invalid-email')).toBe(false)
    })
  })

  describe('validateUrl', () => {
    it('should return true for valid URL', () => {
      expect(validateUrl('https://example.com')).toBe(true)
    })

    it('should return false for invalid URL', () => {
      expect(validateUrl('invalid-url')).toBe(false)
    })
  })
})
