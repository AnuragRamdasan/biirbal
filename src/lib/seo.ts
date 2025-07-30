import { Metadata } from 'next'

export interface SEOConfig {
  title: string
  description: string
  keywords?: string[]
  ogImage?: string
  ogType?: 'website' | 'article' | 'product'
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player'
  canonicalUrl?: string
  noIndex?: boolean
  structuredData?: object
}

import { getBaseUrl } from './config'

const baseUrl = getBaseUrl()

const defaultSEO: SEOConfig = {
  title: 'Biirbal - AI-Powered Slack Content Intelligence',
  description: 'Transform Slack links into 59-second audio summaries. Never miss important content again with AI-powered content intelligence for your team.',
  keywords: [
    'slack bot',
    'ai content summarization', 
    'audio summaries',
    'productivity tools',
    'team collaboration',
    'content intelligence',
    'slack automation',
    'text to speech',
    'link summarization',
    'slack productivity'
  ],
  ogImage: `${baseUrl}/og-image.png`,
  ogType: 'website',
  twitterCard: 'summary_large_image'
}

export function generateMetadata(config: Partial<SEOConfig> = {}): Metadata {
  const seo = { ...defaultSEO, ...config }
  
  const title = config.title || seo.title

  return {
    title,
    description: seo.description,
    keywords: seo.keywords?.join(', '),
    authors: [{ name: 'Biirbal Team' }],
    creator: 'Biirbal',
    publisher: 'Biirbal',
    robots: seo.noIndex ? 'noindex,nofollow' : 'index,follow',
    
    // Open Graph
    openGraph: {
      type: seo.ogType,
      locale: 'en_US',
      url: seo.canonicalUrl || baseUrl,
      siteName: 'Biirbal',
      title,
      description: seo.description,
      images: [
        {
          url: seo.ogImage || `${baseUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: title,
        }
      ],
    },

    // Twitter
    twitter: {
      card: seo.twitterCard,
      site: '@biirbal',
      creator: '@biirbal',
      title,
      description: seo.description,
      images: [seo.ogImage || `${baseUrl}/og-image.png`],
    },

    // Additional metadata
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: seo.canonicalUrl || baseUrl,
    },
    
    // App-specific
    applicationName: 'Biirbal',
    generator: 'Next.js',
    
    // Verification (add your verification codes)
    verification: {
      google: process.env.GOOGLE_VERIFICATION,
      yandex: process.env.YANDEX_VERIFICATION,
      other: {
        'msvalidate.01': process.env.BING_VERIFICATION || '',
      },
    },

    // Icons
    icons: {
      icon: [
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/favicon.ico', sizes: 'any' },
      ],
      apple: [
        { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      ],
      other: [
        { rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#6366f1' },
      ],
    },

    // Web App Manifest
    manifest: '/manifest.json',
  }
}

export function generateStructuredData(typeOrConfig: 'Organization' | 'Product' | 'SoftwareApplication' | 'WebSite' | 'Article' | any, data: any = {}) {
  // Handle both old signature and new signature for backward compatibility
  let type: string
  let config: any = {}
  
  if (typeof typeOrConfig === 'string') {
    // Old signature: generateStructuredData('Organization', data)
    type = typeOrConfig
    config = data
  } else {
    // New signature: generateStructuredData({ type: 'Organization', ...data })
    type = typeOrConfig.type
    config = typeOrConfig
  }
  const baseData = {
    '@context': 'https://schema.org',
    '@type': type,
  }

  switch (type) {
    case 'Organization':
      return {
        ...baseData,
        name: 'Biirbal',
        url: baseUrl,
        logo: `${baseUrl}/logo.png`,
        description: 'AI-powered content intelligence for Slack teams',
        foundingDate: '2024',
        sameAs: [
          'https://twitter.com/biirbal',
          'https://linkedin.com/company/biirbal',
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '+1-555-BIIRBAL',
          contactType: 'customer service',
          email: 'support@biirbal.com'
        },
        ...config
      }

    case 'SoftwareApplication':
      return {
        ...baseData,
        name: 'Biirbal',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web Browser',
        offers: {
          '@type': 'Offer',
          price: '29.99',
          priceCurrency: 'USD',
          priceValidUntil: '2025-12-31',
          availability: 'https://schema.org/InStock'
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          ratingCount: '250',
          bestRating: '5',
          worstRating: '1'
        },
        description: 'Transform Slack links into AI-powered audio summaries',
        url: baseUrl,
        screenshot: `${baseUrl}/app-screenshot.png`,
        ...config
      }

    case 'WebSite':
      return {
        ...baseData,
        name: 'Biirbal',
        url: baseUrl,
        description: 'AI-powered content intelligence for Slack teams',
        publisher: {
          '@type': 'Organization',
          name: 'Biirbal'
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${baseUrl}/search?q={search_term_string}`
          },
          'query-input': 'required name=search_term_string'
        },
        ...config
      }

    case 'WebPage':
      return {
        ...baseData,
        name: config.name || 'Page',
        description: config.description || 'Page description',
        url: config.url || baseUrl,
        ...config
      }

    case 'Product':
      return {
        ...baseData,
        name: 'Biirbal Slack Bot',
        description: 'AI-powered audio summaries for Slack links',
        brand: {
          '@type': 'Brand',
          name: 'Biirbal'
        },
        offers: {
          '@type': 'AggregateOffer',
          lowPrice: '9.99',
          highPrice: '99.99',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock'
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          ratingCount: '250'
        },
        ...config
      }

    case 'Article':
      return {
        ...baseData,
        headline: config.headline || 'Article Title',
        author: config.author || 'Biirbal Team',
        datePublished: config.datePublished || new Date().toISOString(),
        description: config.description || 'Article description',
        ...config
      }

    default:
      return baseData
  }
}

export const jsonLd = {
  organization: generateStructuredData('Organization'),
  website: generateStructuredData('WebSite'),
  software: generateStructuredData('SoftwareApplication'),
  product: generateStructuredData('Product'),
}

// Additional functions expected by tests
export function generateOpenGraphTags(config: {
  title: string
  description: string
  url?: string
  image?: string
  type?: string
}): Record<string, string> {
  return {
    'og:title': config.title,
    'og:description': config.description,
    'og:url': config.url || baseUrl,
    'og:image': config.image || `${baseUrl}/og-image.png`,
    'og:type': config.type || 'website',
    'og:site_name': 'Biirbal'
  }
}

export function generateTwitterTags(config: {
  title: string
  description: string
  image?: string
  card?: string
  site?: string
}): Record<string, string> {
  // Use large image card when image is provided, unless card is explicitly set
  const cardType = config.card || (config.image ? 'summary_large_image' : 'summary')
  
  return {
    'twitter:card': cardType,
    'twitter:site': config.site || '@biirbal',
    'twitter:creator': '@biirbal',
    'twitter:title': config.title,
    'twitter:description': config.description,
    'twitter:image': config.image || `${baseUrl}/og-image.png`
  }
}

export function generateCanonicalUrl(path: string): string {
  // Handle absolute URLs
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path.replace(/\/$/, '') // Remove trailing slash
  }
  
  // Normalize relative paths
  const normalizedPath = path.replace(/^\/+/, '/').replace(/\/+$/, '').replace(/\?.*$/, '') // Remove query params
  
  return `${baseUrl}${normalizedPath}`
}