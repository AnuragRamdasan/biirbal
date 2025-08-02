import { NextResponse } from 'next/server'

export async function GET() {
  const baseUrl = 'https://biirbal.ai'
  const currentDate = new Date().toISOString()
  
  // Define all public pages with their SEO properties
  const pages = [
    {
      url: '/',
      lastModified: currentDate,
      changeFreq: 'weekly',
      priority: 1.0,
      images: [
        {
          url: `${baseUrl}/og-image.png`,
          title: 'Biirbal - AI-Powered Slack Content Intelligence',
          caption: 'Transform Slack links into 59-second audio summaries with AI'
        }
      ]
    },
    {
      url: '/pricing',
      lastModified: currentDate,
      changeFreq: 'weekly',
      priority: 0.9,
      images: [
        {
          url: `${baseUrl}/pricing-og.png`,
          title: 'Biirbal Pricing Plans - Choose Your Perfect Plan',
          caption: 'Flexible pricing for teams of all sizes'
        }
      ]
    },
    {
      url: '/contact',
      lastModified: currentDate,
      changeFreq: 'monthly',
      priority: 0.7
    },
    {
      url: '/terms',
      lastModified: currentDate,
      changeFreq: 'monthly',
      priority: 0.5
    },
    {
      url: '/privacy',
      lastModified: currentDate,
      changeFreq: 'monthly',
      priority: 0.5
    },
    {
      url: '/success',
      lastModified: currentDate,
      changeFreq: 'rarely',
      priority: 0.3
    }
  ]

  // Generate XML sitemap
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${pages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastModified}</lastmod>
    <changefreq>${page.changeFreq}</changefreq>
    <priority>${page.priority}</priority>${page.images ? page.images.map(image => `
    <image:image>
      <image:loc>${image.url}</image:loc>
      <image:title>${image.title}</image:title>
      <image:caption>${image.caption}</image:caption>
    </image:image>`).join('') : ''}
  </url>`).join('\n')}
</urlset>`

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600' // Cache for 1 hour
    }
  })
}