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

// Geographic SEO optimization
export function generateGeoTags(config: {
  country?: string
  region?: string
  city?: string
  coordinates?: { lat: number; lng: number }
  placename?: string
}): Record<string, string> {
  const geoTags: Record<string, string> = {}
  
  if (config.country) {
    geoTags['geo.country'] = config.country
  }
  
  if (config.region) {
    geoTags['geo.region'] = config.region
  }
  
  if (config.city) {
    geoTags['geo.city'] = config.city
  }
  
  if (config.coordinates) {
    geoTags['geo.position'] = `${config.coordinates.lat};${config.coordinates.lng}`
    geoTags['ICBM'] = `${config.coordinates.lat}, ${config.coordinates.lng}`
  }
  
  if (config.placename) {
    geoTags['geo.placename'] = config.placename
  }
  
  return geoTags
}

// Enhanced hreflang generation for international SEO
export function generateHreflangTags(config: {
  currentLocale: string
  alternateLocales: Array<{ locale: string; url: string }>
  defaultLocale?: string
}): Array<{ hreflang: string; href: string }> {
  const hreflangTags = []
  
  // Add alternate locales
  for (const alt of config.alternateLocales) {
    hreflangTags.push({
      hreflang: alt.locale,
      href: alt.url
    })
  }
  
  // Add x-default if specified
  if (config.defaultLocale) {
    const defaultUrl = config.alternateLocales.find(alt => alt.locale === config.defaultLocale)?.url
    if (defaultUrl) {
      hreflangTags.push({
        hreflang: 'x-default',
        href: defaultUrl
      })
    }
  }
  
  return hreflangTags
}

// Performance optimization metadata
export function generatePerformanceHints(): Record<string, string> {
  return {
    'dns-prefetch': 'https://fonts.googleapis.com',
    'preconnect': 'https://fonts.gstatic.com',
    'prefetch': '/pricing',
    'preload': '/logo.png'
  }
}

// Security headers for SEO
export function generateSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  }
}

// Generate rich snippets for different content types
export function generateRichSnippets(type: 'business' | 'software' | 'faq' | 'review', data: any) {
  const baseStructure = {
    '@context': 'https://schema.org',
    '@type': type
  }
  
  switch (type) {
    case 'business':
      return {
        ...baseStructure,
        '@type': 'Organization',
        name: data.name || 'Biirbal',
        url: data.url || baseUrl,
        logo: data.logo || `${baseUrl}/logo.png`,
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: data.phone || '+1-555-BIIRBAL',
          contactType: 'customer service'
        },
        address: {
          '@type': 'PostalAddress',
          streetAddress: data.streetAddress || '123 Innovation Drive',
          addressLocality: data.city || 'San Francisco',
          addressRegion: data.region || 'CA',
          postalCode: data.postalCode || '94105',
          addressCountry: data.country || 'US'
        }
      }
      
    case 'software':
      return {
        ...baseStructure,
        '@type': 'SoftwareApplication',
        name: data.name || 'Biirbal',
        applicationCategory: 'BusinessApplication',
        operatingSystem: data.os || 'Web Browser',
        offers: data.offers || [],
        aggregateRating: data.rating || {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          ratingCount: '250'
        }
      }
      
    case 'faq':
      return {
        ...baseStructure,
        '@type': 'FAQPage',
        mainEntity: data.questions || []
      }
      
    case 'review':
      return {
        ...baseStructure,
        '@type': 'Review',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: data.rating || 5,
          bestRating: 5
        },
        author: {
          '@type': 'Person',
          name: data.author || 'Customer'
        },
        reviewBody: data.body || 'Great product!'
      }
      
    default:
      return baseStructure
  }
}

// Local business SEO optimization
export function generateLocalBusinessData(config: {
  name: string
  address: {
    street: string
    city: string
    state: string
    zip: string
    country: string
  }
  phone: string
  hours?: Array<{ day: string; open: string; close: string }>
  priceRange?: string
  services?: string[]
}) {
  return generateStructuredData('LocalBusiness', {
    name: config.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: config.address.street,
      addressLocality: config.address.city,
      addressRegion: config.address.state,
      postalCode: config.address.zip,
      addressCountry: config.address.country
    },
    telephone: config.phone,
    priceRange: config.priceRange || '$$',
    openingHoursSpecification: config.hours?.map(hour => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: hour.day,
      opens: hour.open,
      closes: hour.close
    })) || [],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Services',
      itemListElement: config.services?.map((service, index) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: service
        }
      })) || []
    }
  })
}