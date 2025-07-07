import { NextResponse } from 'next/server'
import { db } from '@/lib/prisma'

export async function GET() {
  try {
    const healthy = await db.healthCheck()
    return NextResponse.json({ healthy })
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json({ healthy: false }, { status: 503 })
  }
}