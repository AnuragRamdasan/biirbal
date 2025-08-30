import { NextResponse } from 'next/server'
import { fetchTechMemeFeed, processTechMemeArticle } from '@/lib/techmeme-processor'
import { ensureDbConnection } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    logger.info('🕐 TechMeme cron job: Starting feed processing...')
    
    // Note: CRON_SECRET check removed for easier manual testing

    // Check database connection
    const connected = await ensureDbConnection()
    if (!connected) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed'
      }, { status: 503 })
    }

    // Fetch latest TechMeme articles
    const articles = await fetchTechMemeFeed()
    
    if (articles.length === 0) {
      logger.info('No new articles found in TechMeme feed')
      return NextResponse.json({
        success: true,
        message: 'No new articles to process',
        processed: 0
      })
    }

    // Process only the most recent article (to avoid overwhelming the system)
    const recentArticle = articles[0]
    logger.info(`Processing most recent article: ${recentArticle.title}`)

    const processedArticle = await processTechMemeArticle(recentArticle)
    
    const result = {
      success: true,
      processed: processedArticle ? 1 : 0,
      article: processedArticle ? {
        title: processedArticle.title,
        slug: processedArticle.slug,
        url: `/feed/${processedArticle.slug}`
      } : null,
      totalAvailable: articles.length,
      timestamp: new Date().toISOString()
    }

    logger.info('✅ TechMeme cron job completed:', result)
    return NextResponse.json(result)

  } catch (error: any) {
    logger.error('🚨 TechMeme cron job failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Support manual triggering via POST
export async function POST() {
  return GET()
}