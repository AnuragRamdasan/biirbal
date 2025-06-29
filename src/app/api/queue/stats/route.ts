/**
 * Queue Statistics API Route
 * 
 * Provides detailed statistics and health information about the queue system.
 * Used for monitoring, debugging, and operational visibility.
 */

import { NextRequest, NextResponse } from 'next/server'
import { queueClient } from '@/lib/queue/client'
import { workerHealthCheck } from '@/lib/queue/worker'

export async function GET(_request: NextRequest) {
  try {
    console.log(`📊 Queue stats requested`, {
      timestamp: new Date().toISOString()
    })

    // Get comprehensive queue information
    const [stats, health] = await Promise.all([
      queueClient.getStats(),
      queueClient.healthCheck()
    ])

    // Get worker health check
    const workerHealth = await workerHealthCheck()

    const response = {
      success: true,
      data: {
        queue: {
          stats,
          health: {
            healthy: health.healthy,
            issues: health.issues
          }
        },
        worker: {
          healthy: workerHealth.healthy,
          error: workerHealth.error
        },
        system: {
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.version
        }
      }
    }

    console.log(`📊 Queue stats response`, {
      pending: stats.pending,
      processing: stats.processing,
      completed: stats.completed,
      failed: stats.failed,
      healthy: health.healthy
    })

    return NextResponse.json(response)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error(`🚨 Queue stats failed`, {
      error: errorMessage,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get queue statistics',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}