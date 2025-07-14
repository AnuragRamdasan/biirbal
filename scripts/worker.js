const https = require('https');
const http = require('http');

const baseUrl = process.env.NEXTAUTH_URL || 'https://your-app.herokuapp.com';

function makeRequest(path) {
  const url = `${baseUrl}${path}`;
  const client = url.startsWith('https://') ? https : http;
  
  return new Promise((resolve, reject) => {
    const req = client.request(url, { method: 'GET' }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`${path} response:`, res.statusCode, data);
        resolve(data);
      });
    });
    
    req.on('error', (err) => {
      console.error(`${path} error:`, err);
      reject(err);
    });
    
    req.end();
  });
}

async function runWorker() {
  try {
    console.log('Running worker job...');
    await makeRequest('/api/queue/worker');
    console.log('Worker job completed');
  } catch (error) {
    console.error('Worker job failed:', error);
    process.exit(1);
  }
}

runWorker();