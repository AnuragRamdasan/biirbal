import { NextResponse } from 'next/server'
import { queueClient } from '@/lib/queue/client'
import { workerHealthCheck } from '@/lib/queue/bull-worker'

export async function GET() {
  try {
    console.log('🏥 Bull queue health check requested')
    
    const [queueHealth, queueStats] = await Promise.all([
      workerHealthCheck(),
      queueClient.getStats()
    ])
    
    const health = {
      timestamp: new Date().toISOString(),
      healthy: queueHealth.healthy,
      system: 'Bull Queue',
      redis: {
        configured: !!process.env.REDIS_URL,
        connected: queueHealth.redis?.connected || false,
        url: process.env.REDIS_URL ? 'configured' : 'not configured'
      },
      queue: {
        stats: queueStats,
        issues: queueHealth.issues || [],
        name: queueHealth.queueName || 'link processing',
        concurrency: queueHealth.concurrency || 1
      },
      worker: {
        endpoints: [
          '/api/queue/worker',
          '/api/cron/process-queue'
        ],
        type: 'Bull Automatic Processing'
      },
      fallback: {
        enabled: !process.env.REDIS_URL,
        mode: process.env.REDIS_URL ? 'bull' : 'direct'
      }
    }
    
    console.log('📊 Bull queue health status:', health)
    
    return NextResponse.json({
      success: true,
      health,
      message: health.healthy ? 'Bull queue system is healthy' : 'Bull queue system has issues'
    }, { 
      status: health.healthy ? 200 : 503 
    })
    
  } catch (error) {
    console.error('🚨 Bull queue health check failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      fallback: {
        enabled: true,
        message: 'Direct processing fallback is available'
      }
    }, { status: 500 })
  }
}