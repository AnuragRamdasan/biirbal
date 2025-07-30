import { NextResponse } from 'next/server'
import { logger } from './logger'

export class AppError extends Error {
  public statusCode: number
  public isOperational: boolean

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429)
  }
}

export function handleApiError(error: unknown, context?: string): NextResponse {
  const contextLogger = context ? logger.child(context) : logger

  if (error instanceof AppError) {
    contextLogger.warn('Application error', {
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack
    })

    return NextResponse.json(
      { 
        error: error.message,
        statusCode: error.statusCode 
      },
      { status: error.statusCode }
    )
  }

  // Handle Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as any
    
    if (prismaError.code === 'P2002') {
      contextLogger.warn('Prisma unique constraint violation', prismaError)
      return NextResponse.json(
        { error: 'Resource already exists' },
        { status: 409 }
      )
    }
    
    if (prismaError.code === 'P2025') {
      contextLogger.warn('Prisma record not found', prismaError)
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      )
    }
  }

  // Handle Stripe errors
  if (error && typeof error === 'object' && 'type' in error) {
    const stripeError = error as any
    
    if (stripeError.type === 'StripeCardError') {
      contextLogger.warn('Stripe card error', stripeError)
      return NextResponse.json(
        { error: 'Payment failed: ' + stripeError.message },
        { status: 400 }
      )
    }
    
    if (stripeError.type === 'StripeInvalidRequestError') {
      contextLogger.warn('Stripe invalid request', stripeError)
      return NextResponse.json(
        { error: 'Invalid payment request' },
        { status: 400 }
      )
    }
  }

  // Log unexpected errors
  contextLogger.error('Unexpected error', error)

  return NextResponse.json(
    { 
      error: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { 
        details: error instanceof Error ? error.message : String(error) 
      })
    },
    { status: 500 }
  )
}

export function asyncHandler(
  handler: (req: any, ...args: any[]) => Promise<NextResponse>
) {
  return async (req: any, ...args: any[]): Promise<NextResponse> => {
    try {
      return await handler(req, ...args)
    } catch (error) {
      return handleApiError(error, 'AsyncHandler')
    }
  }
}

export function validateRequired(fields: Record<string, any>): void {
  const missing = Object.entries(fields)
    .filter(([, value]) => value === undefined || value === null || value === '')
    .map(([key]) => key)

  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`)
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Handle any error and return a standardized error result.
 */
export function handleError(
  error: unknown,
  context?: string
): { success: false; error: string; context?: string; stack?: string } {
  const message = getErrorMessage(error)
  
  if (context) {
    console.error(context, error)
  } else {
    console.error(error)
  }
  
  return {
    success: false,
    error: message,
    ...(context && { context }),
    ...(error instanceof Error && error.stack && { stack: error.stack })
  }
}

/**
 * Extract a meaningful error message from any error type.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown error occurred'
}

/**
 * Create a Response containing an error in JSON format.
 */
export function createErrorResponse(
  error: string | Error,
  status: number = 500,
  detailsObj?: Record<string, unknown>
): Response {
  const message = getErrorMessage(error)
  const body = {
    success: false,
    error: message,
    ...detailsObj
  }
  
  return new Response(JSON.stringify(body), { 
    status, 
    headers: { 'Content-Type': 'application/json' } 
  })
}

/**
 * Determine if an error is retryable based on common error properties.
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  
  const msg = error.message.toLowerCase()
  const retryableConditions = [
    error.name === 'NetworkError',
    msg.includes('timeout'),
    msg.includes('rate limit'),
    (error as any).status === 503
  ]
  
  return retryableConditions.some(condition => condition)
}

/**
 * Tracks handled errors and exposes utility methods.
 */
export class ErrorHandler {
  private context?: string
  private maxCount: number
  private errors: Array<{ success: false; error: string; context?: string; stack?: string }>

  constructor(context?: string, maxCount: number = Infinity) {
    this.context = context
    this.maxCount = maxCount
    this.errors = []
  }

  handle(error: unknown) {
    const result = handleError(error, this.context)
    this.errors.push(result)
    if (this.errors.length > this.maxCount) {
      this.errors = this.errors.slice(-this.maxCount)
    }
    return result
  }

  getErrorCount(): number {
    return this.errors.length
  }

  getRecentErrors() {
    return this.errors
  }

  reset() {
    this.errors = []
  }
}
