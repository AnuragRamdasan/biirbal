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
    .filter(([_, value]) => value === undefined || value === null || value === '')
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