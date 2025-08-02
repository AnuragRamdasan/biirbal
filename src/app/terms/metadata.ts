import { Metadata } from 'next'
import { generateMetadata, generateStructuredData } from '@/lib/seo'

export const metadata: Metadata = generateMetadata({
  title: 'Terms of Service - Biirbal AI Slack Bot | Legal Terms & Conditions',
  description: 'Read Biirbal\'s Terms of Service covering user rights, responsibilities, data usage, and service availability for our AI-powered Slack content intelligence platform.',
  keywords: [
    'biirbal terms of service',
    'terms and conditions',
    'user agreement',
    'service terms',
    'legal terms',
    'slack bot terms',
    'ai service terms',
    'privacy terms',
    'usage policy',
    'service agreement'
  ],
  canonicalUrl: 'https://biirbal.ai/terms',
  ogImage: 'https://biirbal.ai/terms-og.png',
  ogType: 'website',
  noIndex: false // Legal pages should be indexed for transparency
})

export const termsStructuredData = {
  webpage: generateStructuredData('WebPage', {
    name: 'Terms of Service - Biirbal',
    description: 'Legal terms and conditions for using Biirbal AI-powered Slack bot services',
    url: 'https://biirbal.ai/terms',
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
          name: 'Terms of Service',
          item: 'https://biirbal.ai/terms'
        }
      ]
    }
  }),

  organization: generateStructuredData('Organization', {
    name: 'Biirbal',
    url: 'https://biirbal.ai',
    logo: 'https://biirbal.ai/logo.png',
    termsOfService: 'https://biirbal.ai/terms',
    privacyPolicy: 'https://biirbal.ai/privacy'
  })
}