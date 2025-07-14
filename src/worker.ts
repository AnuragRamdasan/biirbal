import { processJobs } from './lib/queue/bull-worker';

async function startWorker() {
  console.log('Starting Heroku worker...');
  
  // Process jobs continuously
  const processLoop = async () => {
    try {
      await processJobs({ concurrency: 2 });
    } catch (error) {
      console.error('Worker error:', error);
    }
    
    // Schedule next run
    setTimeout(processLoop, 60000); // Run every minute
  };
  
  processLoop();
  
  // Keep the worker alive
  setInterval(() => {
    console.log('Worker heartbeat');
  }, 30000);
}

startWorker().catch(console.error);