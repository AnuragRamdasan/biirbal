import { NextResponse } from 'next/server'
import { checkDatabaseHealth } from '@/lib/db-health'

export async function GET() {
  try {
    const health = await checkDatabaseHealth()
    
    return NextResponse.json(health, {
      status: health.isHealthy ? 200 : 503
    })
  } catch (error) {
    console.error('Health check endpoint failed:', error)
    return NextResponse.json(
      { 
        error: 'Health check failed',
        isHealthy: false,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}