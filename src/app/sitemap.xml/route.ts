import { NextResponse } from 'next/server'
import { getBaseUrl } from '@/lib/config'
import { getDbClient } from '@/lib/db'
import path from 'path'
import fs from 'fs'

// Function to get all blog posts dynamically
async function getBlogPosts(): Promise<Array<{ url: string; lastModified: Date; changeFrequency: string; priority: number }>> {
  const baseUrl = getBaseUrl()
  const blogPosts: Array<{ url: string; lastModified: Date; changeFrequency: string; priority: number }> = []

  try {
    // Get all blog post directories
    const blogDir = path.join(process.cwd(), 'src/app/blog')
    
    if (fs.existsSync(blogDir)) {
      const entries = fs.readdirSync(blogDir, { withFileTypes: true })
      
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== 'page.tsx' && entry.name !== 'layout.tsx') {
          const postPath = path.join(blogDir, entry.name)
          const pageFile = path.join(postPath, 'page.tsx')
          
          if (fs.existsSync(pageFile)) {
            const stats = fs.statSync(pageFile)
            blogPosts.push({
              url: `${baseUrl}/blog/${entry.name}`,
              lastModified: stats.mtime,
              changeFrequency: 'weekly',
              priority: 0.8,
            })
          }
        }
      }
    }
  } catch (error) {
    console.warn('Failed to read blog posts for sitemap:', error)
  }

  return blogPosts
}

// Function to get all feed articles dynamically
async function getFeedArticles(): Promise<Array<{ url: string; lastModified: Date; changeFrequency: string; priority: number }>> {
  const baseUrl = getBaseUrl()
  const feedArticles: Array<{ url: string; lastModified: Date; changeFrequency: string; priority: number }> = []

  try {
    const db = await getDbClient()
    const articles = await db.feedArticle.findMany({
      where: { 
        isPublished: true,
        audioFileUrl: { not: null }
      },
      select: {
        slug: true,
        updatedAt: true
      },
      orderBy: { publishedAt: 'desc' },
      take: 1000 // Include all published articles with audio
    })

    for (const article of articles) {
      feedArticles.push({
        url: `${baseUrl}/newsroom/${article.slug}`,
        lastModified: article.updatedAt,
        changeFrequency: 'monthly',
        priority: 0.8,
      })
    }
  } catch (error) {
    console.warn('Failed to read feed articles for sitemap:', error)
  }

  return feedArticles
}

export async function GET() {
  try {
    const baseUrl = getBaseUrl()
    
    // Static pages with SEO-optimized priorities and frequencies
    const staticPages = [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1.0,
      },
      {
        url: `${baseUrl}/pricing`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.95,
      },
      {
        url: `${baseUrl}/blog`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      },
      {
        url: `${baseUrl}/contact`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.7,
      },
      {
        url: `${baseUrl}/auth/signin`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.8,
      },
      {
        url: `${baseUrl}/success`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.6,
      },
      {
        url: `${baseUrl}/privacy`,
        lastModified: new Date(),
        changeFrequency: 'yearly',
        priority: 0.4,
      },
      {
        url: `${baseUrl}/terms`,
        lastModified: new Date(),
        changeFrequency: 'yearly',
        priority: 0.4,
      },
      {
        url: `${baseUrl}/newsroom`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      },
    ]

    // Get dynamic blog posts and feed articles
    const blogPosts = await getBlogPosts()
    const feedArticles = await getFeedArticles()

    const allPages = [...staticPages, ...blogPosts, ...feedArticles]

    // Generate XML sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(page => `
  <url>
    <loc>${page.url}</loc>
    <lastmod>${page.lastModified.toISOString()}</lastmod>
    <changefreq>${page.changeFrequency}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('')}
</urlset>`

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600' // Cache for 1 hour
      }
    })
  } catch (error) {
    console.error('Failed to generate sitemap:', error)
    return new NextResponse('Error generating sitemap', { status: 500 })
  }
}