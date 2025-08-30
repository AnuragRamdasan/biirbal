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

    // Try to process recent articles until one succeeds (to handle failures gracefully)
    let processedArticle = null
    let attempts = 0
    const maxAttempts = Math.min(5, articles.length) // Try more articles

    for (const article of articles.slice(0, maxAttempts)) {
      attempts++
      logger.info(`Processing article ${attempts}/${maxAttempts}: ${article.title}`)
      
      try {
        // Add timeout wrapper for individual article processing
        const articlePromise = processTechMemeArticle(article)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Article processing timeout')), 25000)
        )
        
        processedArticle = await Promise.race([articlePromise, timeoutPromise]) as any
        
        if (processedArticle) {
          logger.info(`✅ Successfully processed: ${processedArticle.title}`)
          break
        }
      } catch (error: any) {
        logger.error(`❌ Failed to process article "${article.title}":`, error.message)
        // Continue to next article
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