#!/usr/bin/env node

// Load environment variables
require('dotenv').config();

// Use ts-node to run TypeScript files directly
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es2020',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    skipLibCheck: true,
    moduleResolution: 'node'
  }
});

const { runVideoGenerationJob } = require('../src/lib/video-generator/main-pipeline.ts');

async function main() {
  try {
    console.log('🤖 Starting video generation job...');
    
    const result = await runVideoGenerationJob();
    
    console.log('✅ Video generation job completed successfully:');
    console.log(`- Article: ${result.articleTitle}`);
    console.log(`- Video Created: ${result.videoCreated}`);
    console.log(`- Social Posts: ${result.socialPosts.length}`);
    
    result.socialPosts.forEach(post => {
      console.log(`  - ${post.platform}: ${post.success ? '✅ Success' : '❌ Failed'}`);
      if (post.error) {
        console.log(`    Error: ${post.error}`);
      }
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Video generation job failed:', error);
    process.exit(1);
  }
}

main();