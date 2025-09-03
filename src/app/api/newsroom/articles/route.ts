import { NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const source = searchParams.get('source') // Optional source filter
    
    const db = await getDbClient()
    
    const whereClause: any = {
      isPublished: true,
      audioFileUrl: { not: null }
    }
    
    // Add source filter if specified
    if (source && source !== 'all') {
      whereClause.source = source
    }
    
    const articles = await db.feedArticle.findMany({
      where: whereClause,
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        url: true,
        slug: true,
        summary: true,
        audioFileUrl: true,
        publishedAt: true,
        wordCount: true,
        ogImage: true,
        source: true
      }
    })

    const processedArticles = articles.map(article => ({
      ...article,
      summary: article.summary!,
      audioFileUrl: article.audioFileUrl!,
      wordCount: article.wordCount!
    }))
    
    return NextResponse.json({ articles: processedArticles })
  } catch (error) {
    console.error('Failed to fetch newsroom articles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    )
  }
}