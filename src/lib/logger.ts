type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  data?: any
  context?: string
}

class Logger {
  private context?: string

  constructor(context?: string) {
    this.context = context
  }

  private log(level: LogLevel, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context
    }

    if (data) {
      entry.data = data
    }

    // In production, you might want to send logs to a service like DataDog, LogRocket, etc.
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(entry))
    } else {
      // Pretty print in development
      const prefix = `[${entry.timestamp}] ${level.toUpperCase()}`
      const contextStr = this.context ? ` [${this.context}]` : ''
      console.log(`${prefix}${contextStr}: ${message}`, data || '')
    }
  }

  info(message: string, data?: any): void {
    this.log('info', message, data)
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data)
  }

  error(message: string, error?: Error | any): void {
    const errorData = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error

    this.log('error', message, errorData)
  }

  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, data)
    }
  }

  child(context: string): Logger {
    const childContext = this.context ? `${this.context}:${context}` : context
    return new Logger(childContext)
  }
}

export const logger = new Logger()
export { Logger }