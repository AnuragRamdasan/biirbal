// Enhanced logging for Vercel deployment

interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  data?: any
  context?: string
}

class Logger {
  private context: string

  constructor(context: string = 'App') {
    this.context = context
  }

  private formatLog(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      context: this.context
    }
  }

  private output(entry: LogEntry) {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.context}]`
    
    // Always use console.error for important logs (Vercel shows these prominently)
    if (entry.level === 'error') {
      console.error(`❌ ${prefix} ${entry.message}`, entry.data || '')
    } else if (entry.level === 'warn') {
      console.warn(`⚠️  ${prefix} ${entry.message}`, entry.data || '')
    } else {
      // Use console.error even for info logs to ensure they show up in Vercel
      console.error(`ℹ️  ${prefix} ${entry.message}`, entry.data || '')
    }

    // Also write to stdout for Vercel Function logs
    process.stdout.write(JSON.stringify(entry) + '\n')
  }

  info(message: string, data?: any) {
    this.output(this.formatLog('info', message, data))
  }

  warn(message: string, data?: any) {
    this.output(this.formatLog('warn', message, data))
  }

  error(message: string, data?: any) {
    this.output(this.formatLog('error', message, data))
  }

  debug(message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      this.output(this.formatLog('debug', message, data))
    }
  }

  // Performance logging
  time(label: string) {
    this.info(`⏱️  Timer started: ${label}`)
    console.time(label)
  }

  timeEnd(label: string) {
    console.timeEnd(label)
    this.info(`⏱️  Timer ended: ${label}`)
  }

  // Vercel-specific logging
  vercelLog(message: string, data?: any) {
    // Use stderr which Vercel captures more reliably
    process.stderr.write(`VERCEL_LOG: ${message} ${JSON.stringify(data || {})}\n`)
    this.info(message, data)
  }

  child(context: string) {
    return new Logger(`${this.context}:${context}`)
  }
}

// Export pre-configured loggers
export const logger = new Logger('BiirbalAI')
export const slackLogger = logger.child('Slack')
export const queueLogger = logger.child('Queue')
export const ttsLogger = logger.child('TTS')
export const extractorLogger = logger.child('Extractor')

// Factory function to create logger instances
export function createLogger(context: string) {
  return new Logger(context)
}

