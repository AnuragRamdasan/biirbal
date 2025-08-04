import { MetadataRoute } from 'next'
import { getBaseUrl } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl()
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/pricing',
          '/contact',
          '/privacy',
          '/terms',
          '/blog',
          '/blog/*',
        ],
        disallow: [
          '/team*',
          '/profile*',
          '/invite/*',
          '/api/*',
          '/_next/*',
          '/admin/*',
          '*.json$',
          '/.*',
        ],
      },
      // Optimized rules for major search engines
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/pricing',
          '/contact',
          '/privacy',
          '/terms',
          '/blog',
          '/blog/*',
        ],
        disallow: [
          '/team*',
          '/profile*',
          '/invite/*',
          '/api/*',
          '/_next/*',
          '/admin/*',
        ],
        crawlDelay: 1,
      },
      {
        userAgent: ['Bingbot', 'Slurp'],
        allow: [
          '/',
          '/pricing',
          '/contact',
          '/privacy',
          '/terms',
          '/blog',
          '/blog/*',
        ],
        disallow: [
          '/team*',
          '/profile*',
          '/invite/*',
          '/api/*',
          '/_next/*',
          '/admin/*',
        ],
        crawlDelay: 2,
      },
      {
        userAgent: 'DuckDuckBot',
        allow: [
          '/',
          '/pricing',
          '/contact',
          '/privacy',
          '/terms',
          '/blog',
          '/blog/*',
        ],
        disallow: [
          '/team*',
          '/profile*',
          '/invite/*',
          '/api/*',
          '/_next/*',
          '/admin/*',
        ],
        crawlDelay: 1,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}