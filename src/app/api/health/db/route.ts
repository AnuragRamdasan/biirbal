import { NextResponse } from 'next/server'
import { dbHealthCheck } from '@/lib/db'

export async function GET() {
  try {
    const healthy = await dbHealthCheck()
    return NextResponse.json({ healthy })
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json({ healthy: false }, { status: 503 })
  }
}