"use strict";
// Enhanced logging for Vercel deployment
Object.defineProperty(exports, "__esModule", { value: true });
exports.legacyLog = exports.extractorLogger = exports.ttsLogger = exports.queueLogger = exports.slackLogger = exports.logger = void 0;
exports.createLogger = createLogger;
exports.log = log;
exports.logError = logError;
exports.logPerformance = logPerformance;
class Logger {
    constructor(context = 'App') {
        this.context = context;
    }
    formatLog(level, message, data) {
        return {
            timestamp: new Date().toISOString(),
            level,
            message,
            data,
            context: this.context
        };
    }
    output(entry) {
        const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.context}]`;
        // Always use console.error for important logs (Vercel shows these prominently)
        if (entry.level === 'error') {
            console.error(`❌ ${prefix} ${entry.message}`, entry.data || '');
        }
        else if (entry.level === 'warn') {
            console.warn(`⚠️  ${prefix} ${entry.message}`, entry.data || '');
        }
        else {
            // Use console.error even for info logs to ensure they show up in Vercel
            console.error(`ℹ️  ${prefix} ${entry.message}`, entry.data || '');
        }
        // Also write to stdout for Vercel Function logs
        process.stdout.write(JSON.stringify(entry) + '\n');
    }
    info(message, data) {
        this.output(this.formatLog('info', message, data));
    }
    warn(message, data) {
        this.output(this.formatLog('warn', message, data));
    }
    error(message, data) {
        this.output(this.formatLog('error', message, data));
    }
    debug(message, data) {
        if (process.env.NODE_ENV === 'development') {
            this.output(this.formatLog('debug', message, data));
        }
    }
    // Performance logging
    time(label) {
        this.info(`⏱️  Timer started: ${label}`);
        console.time(label);
    }
    timeEnd(label) {
        console.timeEnd(label);
        this.info(`⏱️  Timer ended: ${label}`);
    }
    // Vercel-specific logging
    vercelLog(message, data) {
        // Use stderr which Vercel captures more reliably
        process.stderr.write(`VERCEL_LOG: ${message} ${JSON.stringify(data || {})}\n`);
        this.info(message, data);
    }
    child(context) {
        return new Logger(`${this.context}:${context}`);
    }
}
// Export pre-configured loggers
exports.logger = new Logger('BiirbalAI');
exports.slackLogger = exports.logger.child('Slack');
exports.queueLogger = exports.logger.child('Queue');
exports.ttsLogger = exports.logger.child('TTS');
exports.extractorLogger = exports.logger.child('Extractor');
// Factory function to create logger instances
function createLogger(context) {
    return new Logger(context);
}
// Legacy logging functions for backward compatibility
function log(level, message, data) {
    // Suppress debug logs in production
    if (level === 'debug' && process.env.NODE_ENV === 'production') {
        return;
    }
    const timestamp = new Date().toISOString();
    const levelUpper = level.toUpperCase();
    const logMessage = `${timestamp} [${levelUpper}] ${message}`;
    if (level === 'error') {
        console.error(logMessage, data || '');
    }
    else if (level === 'warn') {
        console.log(logMessage, data || '');
    }
    else {
        console.log(logMessage, data || '');
    }
}
function logError(context, error) {
    const timestamp = new Date().toISOString();
    let errorMessage = `${timestamp} [ERROR] ${context}: `;
    if (error instanceof Error) {
        errorMessage += `${error.message}`;
        if (error.stack) {
            errorMessage += `\nStack: ${error.stack}`;
        }
    }
    else if (typeof error === 'string') {
        errorMessage += error;
    }
    else {
        errorMessage += JSON.stringify(error);
    }
    console.error(errorMessage);
}
function logPerformance(label, duration) {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} [PERF] ${label}: ${duration}ms`);
}
// Legacy console replacement object (for existing code)
exports.legacyLog = {
    info: (msg, data) => exports.logger.info(msg, data),
    warn: (msg, data) => exports.logger.warn(msg, data),
    error: (msg, data) => exports.logger.error(msg, data),
    debug: (msg, data) => exports.logger.debug(msg, data),
};
