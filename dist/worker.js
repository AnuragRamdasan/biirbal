"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bull_worker_1 = require("./lib/queue/bull-worker");
async function startWorker() {
    console.log('Starting Heroku worker...');
    // Process jobs continuously
    (0, bull_worker_1.processQueuedJobs)();
    // Keep the worker alive
    setInterval(() => {
        console.log('Worker heartbeat');
    }, 30000);
}
startWorker().catch(console.error);
