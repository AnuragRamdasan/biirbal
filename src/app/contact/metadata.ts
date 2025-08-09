import { Metadata } from 'next'
import { generateMetadata, generateStructuredData } from '@/lib/seo'

export const metadata: Metadata = generateMetadata({
  title: 'Contact Biirbal Support - 24hr Response | AI Content Platform Help',
  description: 'Get expert help with Biirbal AI content intelligence platform. Fast 24-hour response for setup, billing, and technical support. Live chat available. 10,000+ readers trust our support.',
  keywords: [
    'biirbal support',
    'contact biirbal',
    'slack bot help',
    'customer support',
    'technical support',
    'billing support',
    'help center',
    'contact form',
    'support ticket',
    'customer service'
  ],
  canonicalUrl: 'https://www.biirbal.com/contact',
  ogImage: 'https://www.biirbal.com/contact-og.png',
  ogType: 'website'
})

export const contactStructuredData = {
  organization: generateStructuredData('Organization', {
    name: 'Biirbal',
    url: 'https://www.biirbal.com',
    logo: 'https://www.biirbal.com/logo.png',
    description: 'AI-powered content intelligence for Slack teams',
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: '+1-555-BIIRBAL',
        contactType: 'customer service',
        email: 'support@biirbal.com',
        availableLanguage: ['English'],
        hoursAvailable: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          opens: '09:00',
          closes: '17:00',
          validFrom: '2024-01-01',
          validThrough: '2025-12-31'
        }
      },
      {
        '@type': 'ContactPoint',
        contactType: 'technical support',
        email: 'tech@biirbal.com',
        availableLanguage: ['English']
      },
      {
        '@type': 'ContactPoint',
        contactType: 'billing support',
        email: 'billing@biirbal.com',
        availableLanguage: ['English']
      }
    ],
    address: {
      '@type': 'PostalAddress',
      streetAddress: '123 Innovation Drive',
      addressLocality: 'San Francisco',
      addressRegion: 'CA',
      postalCode: '94105',
      addressCountry: 'US'
    }
  }),

  webpage: generateStructuredData('WebPage', {
    name: 'Contact Biirbal Support',
    description: 'Get in touch with Biirbal support team for help with your AI-powered Slack bot',
    url: 'https://www.biirbal.com/contact',
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
          name: 'Contact',
          item: 'https://www.biirbal.com/contact'
        }
      ]
    }
  })
}