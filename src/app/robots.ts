import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://biirbal.ai'
  
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