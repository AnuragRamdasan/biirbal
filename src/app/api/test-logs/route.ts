import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  // Test multiple log methods
  console.log('🟢 Standard console.log')
  console.error('🔴 Standard console.error') 
  console.warn('🟡 Standard console.warn')
  
  logger.info('ℹ️ Logger info message', { test: 'data' })
  logger.warn('⚠️ Logger warn message', { test: 'data' })
  logger.error('❌ Logger error message', { test: 'data' })
  logger.vercelLog('🚀 Special Vercel log', { timestamp: new Date(), test: true })

  return NextResponse.json({ 
    message: 'Log test completed - check Vercel dashboard Functions tab',
    timestamp: new Date().toISOString()
  })
}