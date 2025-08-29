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
          '/feed',
          '/feed/*',
          '/auth/signin',
          '/success',
        ],
        disallow: [
          '/team*',
          '/profile*',
          '/invite/*',
          '/api/*',
          '/_next/*',
          '/admin/*',
          '/dashboard*',
          '/auth/error',
          '/auth/verify-request',
          '*.json$',
          '/.*',
          '/debug*',
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
          '/feed',
          '/feed/*',
        ],
        disallow: [
          '/team*',
          '/profile*',
          '/invite/*',
          '/api/*',
          '/_next/*',
          '/admin/*',
        ],
        crawlDelay: 0.5,
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
          '/feed',
          '/feed/*',
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
        userAgent: 'DuckDuckBot',
        allow: [
          '/',
          '/pricing',
          '/contact',
          '/privacy',
          '/terms',
          '/blog',
          '/blog/*',
          '/feed',
          '/feed/*',
        ],
        disallow: [
          '/team*',
          '/profile*',
          '/invite/*',
          '/api/*',
          '/_next/*',
          '/admin/*',
        ],
        crawlDelay: 0.5,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}