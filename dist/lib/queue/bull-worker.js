"use strict";
/**
 * Bull Worker Implementation
 *
 * Since Bull handles job processing automatically, this provides
 * management functions for the worker and queue monitoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.processJobs = processJobs;
exports.workerHealthCheck = workerHealthCheck;
exports.pauseWorker = pauseWorker;
exports.resumeWorker = resumeWorker;
exports.getJobDetails = getJobDetails;
exports.forceProcessJobs = forceProcessJobs;
const bull_queue_1 = require("./bull-queue");
/**
 * Bull automatically processes jobs, but this function provides
 * manual control and monitoring capabilities
 */
async function processJobs(options = {}) {
    const { concurrency = 1, workerId = `bull-worker-${Date.now()}-${Math.random().toString(36).substr(2, 6)}` } = options;
    const startTime = Date.now();
    console.log(`🐂 Bull worker ${workerId} monitoring queue`, {
        concurrency,
        startTime: new Date(startTime).toISOString()
    });
    try {
        // Get current stats
        const stats = await bull_queue_1.queueManager.getStats();
        const health = await bull_queue_1.queueManager.getHealth();
        console.log(`📊 Bull queue status:`, {
            stats,
            health: health.healthy,
            paused: health.paused
        });
        // If queue is paused, resume it
        if (health.paused) {
            console.log(`▶️  Resuming paused Bull queue`);
            await bull_queue_1.queueManager.resume();
        }
        // Note: Bull concurrency is set in the queue definition, not dynamically
        console.log(`🐂 Bull queue running with concurrency: ${concurrency}`);
        // Clean old jobs if needed
        if (stats.completed > 100 || stats.failed > 50) {
            console.log(`🧹 Cleaning old jobs`);
            await bull_queue_1.queueManager.clean();
        }
        const duration = Date.now() - startTime;
        const results = {
            processed: stats.active + stats.waiting, // Jobs that will be processed
            completed: stats.completed,
            failed: stats.failed,
            workerId,
            duration,
            stats,
            health
        };
        console.log(`🏁 Bull worker ${workerId} status check completed`, results);
        return results;
    }
    catch (error) {
        console.error(`🚨 Bull worker ${workerId} encountered error`, {
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - startTime
        });
        throw error;
    }
}
/**
 * Health check for Bull worker functionality
 */
async function workerHealthCheck() {
    try {
        const health = await bull_queue_1.queueManager.getHealth();
        const stats = await bull_queue_1.queueManager.getStats();
        return {
            healthy: health.healthy,
            stats,
            issues: health.paused ? ['Queue is paused'] : [],
            redis: health.redis,
            timestamp: Date.now(),
            queueName: bull_queue_1.linkProcessingQueue.name,
            concurrency: 1 // Bull handles concurrency internally
        };
    }
    catch (error) {
        return {
            healthy: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now()
        };
    }
}
/**
 * Pause the Bull queue
 */
async function pauseWorker() {
    await bull_queue_1.queueManager.pause();
    console.log('⏸️  Bull worker paused');
}
/**
 * Resume the Bull queue
 */
async function resumeWorker() {
    await bull_queue_1.queueManager.resume();
    console.log('▶️  Bull worker resumed');
}
/**
 * Get detailed job information
 */
async function getJobDetails(jobId) {
    try {
        const job = await bull_queue_1.queueManager.getJob(jobId);
        if (!job)
            return null;
        const state = await job.getState();
        return {
            id: job.id,
            state,
            data: job.data,
            progress: job.progress(),
            attemptsMade: job.attemptsMade,
            finishedOn: job.finishedOn,
            processedOn: job.processedOn,
            timestamp: job.timestamp,
            failedReason: job.failedReason,
            stacktrace: job.stacktrace
        };
    }
    catch (error) {
        console.error('Failed to get job details:', error);
        return null;
    }
}
/**
 * Force process specific number of jobs (for manual testing)
 */
async function forceProcessJobs(count = 1) {
    console.log(`🔧 Force processing ${count} jobs`);
    // This is just a status check since Bull handles processing automatically
    const stats = await bull_queue_1.queueManager.getStats();
    if (stats.waiting === 0) {
        console.log('📭 No jobs waiting to be processed');
        return { processed: 0, message: 'No jobs in queue' };
    }
    console.log(`🚀 Bull is automatically processing ${stats.active} jobs, ${stats.waiting} waiting`);
    return {
        processed: stats.active,
        waiting: stats.waiting,
        message: 'Bull handles processing automatically'
    };
}
