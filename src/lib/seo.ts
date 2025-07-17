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
  title: 'biirbal.ai - AI-Powered Slack Content Intelligence',
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
  
  const title = config.title 
    ? `${config.title} | biirbal.ai`
    : seo.title

  return {
    title,
    description: seo.description,
    keywords: seo.keywords?.join(', '),
    authors: [{ name: 'biirbal.ai Team' }],
    creator: 'biirbal.ai',
    publisher: 'biirbal.ai',
    robots: seo.noIndex ? 'noindex,nofollow' : 'index,follow',
    
    // Open Graph
    openGraph: {
      type: seo.ogType,
      locale: 'en_US',
      url: seo.canonicalUrl || baseUrl,
      siteName: 'biirbal.ai',
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
      site: '@biirbal_ai',
      creator: '@biirbal_ai',
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
    applicationName: 'biirbal.ai',
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

export function generateStructuredData(type: 'Organization' | 'Product' | 'SoftwareApplication' | 'WebSite', data: any = {}) {
  const baseData = {
    '@context': 'https://schema.org',
    '@type': type,
  }

  switch (type) {
    case 'Organization':
      return {
        ...baseData,
        name: 'biirbal.ai',
        url: baseUrl,
        logo: `${baseUrl}/logo.png`,
        description: 'AI-powered content intelligence for Slack teams',
        foundingDate: '2024',
        sameAs: [
          'https://twitter.com/biirbal_ai',
          'https://linkedin.com/company/biirbal-ai',
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '+1-555-BIIRBAL',
          contactType: 'customer service',
          email: 'support@biirbal.ai'
        },
        ...data
      }

    case 'SoftwareApplication':
      return {
        ...baseData,
        name: 'biirbal.ai',
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
        ...data
      }

    case 'WebSite':
      return {
        ...baseData,
        name: 'biirbal.ai',
        url: baseUrl,
        description: 'AI-powered content intelligence for Slack teams',
        publisher: {
          '@type': 'Organization',
          name: 'biirbal.ai'
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${baseUrl}/search?q={search_term_string}`
          },
          'query-input': 'required name=search_term_string'
        },
        ...data
      }

    case 'Product':
      return {
        ...baseData,
        name: 'biirbal.ai Slack Bot',
        description: 'AI-powered audio summaries for Slack links',
        brand: {
          '@type': 'Brand',
          name: 'biirbal.ai'
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
        ...data
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