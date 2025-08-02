"use strict";
// Enhanced logging for Vercel deployment
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractorLogger = exports.ttsLogger = exports.queueLogger = exports.slackLogger = exports.logger = void 0;
exports.createLogger = createLogger;
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
