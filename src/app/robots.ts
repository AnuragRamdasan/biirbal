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
          '/support',
          '/privacy',
          '/terms',
        ],
        disallow: [
          '/dashboard/',
          '/api/',
          '/admin/',
          '/_next/',
          '/static/',
          '*.json',
          '/tmp/',
        ],
      },
      // Allow search engines to access public pages
      {
        userAgent: ['Googlebot', 'Bingbot', 'Slurp'],
        allow: [
          '/',
          '/pricing',
          '/support',
          '/privacy',
          '/terms',
        ],
        disallow: [
          '/dashboard/',
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}