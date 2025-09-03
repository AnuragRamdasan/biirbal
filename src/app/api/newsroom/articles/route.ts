import { NextResponse } from 'next/server'
import { getLatestFeedArticles } from '@/lib/techmeme-processor'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    
    const articles = await getLatestFeedArticles(limit)
    
    return NextResponse.json({ articles })
  } catch (error) {
    console.error('Failed to fetch newsroom articles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    )
  }
}