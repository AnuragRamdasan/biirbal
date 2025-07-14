"use strict";
/**
 * Queue Client - Now powered by Bull!
 *
 * Robust queue implementation using Bull with Redis backend
 * Falls back to direct processing if Bull/Redis unavailable
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueClient = void 0;
const bull_client_1 = require("./bull-client");
const fallback_1 = require("./fallback");
class QueueClient {
    /**
     * Add a new job to the queue
     */
    async add(type, data, options = {}) {
        console.log(`🐂 Bull-powered queue adding ${type} job`, { url: data.url });
        try {
            // Use Bull queue client
            return await bull_client_1.queueClient.add(type, data, options);
        }
        catch (error) {
            console.error(`🚨 Bull queue failed, using fallback:`, error);
            // Fallback to direct processing
            const jobId = `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            setImmediate(() => {
                (0, fallback_1.processFallback)(data).catch(fallbackError => {
                    console.error('Fallback processing failed:', fallbackError);
                });
            });
            return jobId;
        }
    }
    /**
     * Get job status and details
     */
    async getStatus(jobId) {
        try {
            return await bull_client_1.queueClient.getStatus(jobId);
        }
        catch (error) {
            console.error(`🚨 Get status failed:`, error);
            return null;
        }
    }
    /**
     * Get queue statistics
     */
    async getStats() {
        try {
            return await bull_client_1.queueClient.getStats();
        }
        catch (error) {
            console.error(`🚨 Get stats failed:`, error);
            return {
                pending: 0,
                processing: 0,
                completed: 0,
                failed: 0,
                avgProcessingTime: 0,
                healthy: false
            };
        }
    }
    /**
     * Clean up old jobs
     */
    async cleanup() {
        try {
            return await bull_client_1.queueClient.cleanup();
        }
        catch (error) {
            console.error(`🚨 Cleanup failed:`, error);
            return { cleaned: 0, reset: 0 };
        }
    }
    /**
     * Health check
     */
    async healthCheck() {
        try {
            return await bull_client_1.queueClient.healthCheck();
        }
        catch (error) {
            return {
                healthy: false,
                issues: ['Health check failed'],
                stats: await this.getStats()
            };
        }
    }
}
// Export singleton instance
exports.queueClient = new QueueClient();
