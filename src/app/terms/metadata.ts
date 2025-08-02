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
  canonicalUrl: 'https://www.biirbal.com/terms',
  ogImage: 'https://www.biirbal.com/terms-og.png',
  ogType: 'website',
  noIndex: false // Legal pages should be indexed for transparency
})

export const termsStructuredData = {
  webpage: generateStructuredData('WebPage', {
    name: 'Terms of Service - Biirbal',
    description: 'Legal terms and conditions for using Biirbal AI-powered Slack bot services',
    url: 'https://www.biirbal.com/terms',
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
        url: 'https://www.biirbal.com/logo.png'
      }
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://www.biirbal.com'
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Terms of Service',
          item: 'https://www.biirbal.com/terms'
        }
      ]
    }
  }),

  organization: generateStructuredData('Organization', {
    name: 'Biirbal',
    url: 'https://www.biirbal.com',
    logo: 'https://www.biirbal.com/logo.png',
    termsOfService: 'https://www.biirbal.com/terms',
    privacyPolicy: 'https://www.biirbal.com/privacy'
  })
}