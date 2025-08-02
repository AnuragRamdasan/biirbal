import { Metadata } from 'next'
import { generateMetadata, generateStructuredData } from '@/lib/seo'

export const metadata: Metadata = generateMetadata({
  title: 'Privacy Policy - Biirbal AI | Data Protection & Privacy Practices',
  description: 'Learn how Biirbal protects your data and privacy. Our comprehensive privacy policy covers data collection, processing, storage, and your rights regarding personal information.',
  keywords: [
    'biirbal privacy policy',
    'data protection',
    'privacy practices',
    'gdpr compliance',
    'data security',
    'user privacy',
    'data collection',
    'privacy rights',
    'data processing',
    'slack data privacy'
  ],
  canonicalUrl: 'https://biirbal.ai/privacy',
  ogImage: 'https://biirbal.ai/privacy-og.png',
  ogType: 'website',
  noIndex: false // Privacy policies should be indexed for transparency
})

export const privacyStructuredData = {
  webpage: generateStructuredData('WebPage', {
    name: 'Privacy Policy - Biirbal',
    description: 'Comprehensive privacy policy detailing how Biirbal protects user data and maintains privacy',
    url: 'https://biirbal.ai/privacy',
    datePublished: '2024-01-01T00:00:00.000Z',
    dateModified: '2025-08-02T00:00:00.000Z',
    author: {
      '@type': 'Organization',
      name: 'Biirbal'
    },
    publisher: {
      '@type': 'Organization',
      name: 'Biirbal',
      logo: {
        '@type': 'ImageObject',
        url: 'https://biirbal.ai/logo.png'
      }
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://biirbal.ai'
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Privacy Policy',
          item: 'https://biirbal.ai/privacy'
        }
      ]
    }
  }),

  organization: generateStructuredData('Organization', {
    name: 'Biirbal',
    url: 'https://biirbal.ai',
    logo: 'https://biirbal.ai/logo.png',
    privacyPolicy: 'https://biirbal.ai/privacy',
    foundingDate: '2024',
    description: 'AI-powered content intelligence platform prioritizing user privacy and data protection'
  })
}