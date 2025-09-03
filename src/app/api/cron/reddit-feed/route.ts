import { NextResponse } from 'next/server'
import { fetchRedditFeed, processRedditArticle } from '@/lib/reddit-processor'
import { ensureDbConnection } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    logger.info('🕐 Reddit cron job: Starting feed processing...')
    
    // Check database connection
    const connected = await ensureDbConnection()
    if (!connected) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed'
      }, { status: 503 })
    }

    // Fetch latest Reddit articles
    const articles = await fetchRedditFeed()
    
    if (articles.length === 0) {
      logger.info('No new articles found in Reddit feed')
      return NextResponse.json({
        success: true,
        message: 'No new articles to process',
        processed: 0
      })
    }

    // Try to process recent articles until one succeeds
    let processedArticle = null
    let attempts = 0
    const maxAttempts = Math.min(5, articles.length)

    for (const article of articles.slice(0, maxAttempts)) {
      attempts++
      logger.info(`Processing Reddit article ${attempts}/${maxAttempts}: ${article.title}`)
      
      try {
        // Add timeout wrapper for individual article processing
        const articlePromise = processRedditArticle(article)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Article processing timeout')), 25000)
        )
        
        processedArticle = await Promise.race([articlePromise, timeoutPromise]) as any
        
        if (processedArticle) {
          logger.info(`✅ Successfully processed: ${processedArticle.title}`)
          break
        }
      } catch (error: any) {
        logger.error(`❌ Failed to process Reddit article "${article.title}":`, error.message)
        continue
      }
    }
    
    const result = {
      success: true,
      processed: processedArticle ? 1 : 0,
      attempts,
      article: processedArticle ? {
        title: processedArticle.title,
        slug: processedArticle.slug,
        url: `/newsroom/${processedArticle.slug}`
      } : null,
      totalAvailable: articles.length,
      timestamp: new Date().toISOString()
    }

    logger.info('✅ Reddit cron job completed:', result)
    return NextResponse.json(result)

  } catch (error: any) {
    logger.error('🚨 Reddit cron job failed:', error)
    
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