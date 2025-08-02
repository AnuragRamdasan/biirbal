import { Metadata } from 'next'
import { generateMetadata, generateStructuredData } from '@/lib/seo'

export const metadata: Metadata = generateMetadata({
  title: 'Biirbal - AI-Powered Slack Content Intelligence | 59-Second Audio Summaries',
  description: 'Transform Slack links into instant 59-second audio summaries. Never miss important content again with AI-powered content intelligence. Free plan with 20 monthly summaries. Get started in seconds.',
  keywords: [
    'slack bot',
    'ai content summarization',
    'audio summaries',
    'slack automation',
    'team productivity tools',
    'content intelligence',
    'link summarization',
    'text to speech',
    'slack productivity',
    'team collaboration',
    'ai-powered slack bot',
    'instant summaries',
    'slack link processing',
    'team communication',
    'workplace efficiency'
  ],
  canonicalUrl: 'https://biirbal.ai/',
  ogImage: 'https://biirbal.ai/og-image.png',
  ogType: 'website'
})

export const homepageStructuredData = {
  organization: generateStructuredData('Organization', {
    name: 'Biirbal',
    url: 'https://biirbal.ai',
    logo: 'https://biirbal.ai/logo.png',
    description: 'AI-powered content intelligence for Slack teams providing instant audio summaries',
    foundingDate: '2024',
    sameAs: [
      'https://twitter.com/biirbal',
      'https://linkedin.com/company/biirbal',
      'https://github.com/biirbal'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-555-BIIRBAL',
      contactType: 'customer service',
      email: 'support@biirbal.ai',
      availableLanguage: ['English']
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: '123 Innovation Drive',
      addressLocality: 'San Francisco',
      addressRegion: 'CA',
      postalCode: '94105',
      addressCountry: 'US'
    }
  }),

  website: generateStructuredData('WebSite', {
    name: 'Biirbal - AI-Powered Slack Content Intelligence',
    url: 'https://biirbal.ai',
    description: 'Transform Slack links into instant audio summaries with AI-powered content intelligence',
    publisher: {
      '@type': 'Organization',
      name: 'Biirbal'
    },
    potentialAction: [
      {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://biirbal.ai/search?q={search_term_string}'
        },
        'query-input': 'required name=search_term_string'
      },
      {
        '@type': 'SubscribeAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://biirbal.ai/pricing'
        },
        expectsAcceptanceOf: 'https://biirbal.ai/terms'
      }
    ]
  }),

  softwareApplication: generateStructuredData('SoftwareApplication', {
    name: 'Biirbal Slack Bot',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web Browser, Slack',
    description: 'AI-powered Slack bot that transforms shared links into 59-second audio summaries',
    url: 'https://biirbal.ai',
    downloadUrl: 'https://slack.com/apps/biirbal',
    screenshot: 'https://biirbal.ai/app-screenshot.png',
    author: {
      '@type': 'Organization',
      name: 'Biirbal'
    },
    offers: [
      {
        '@type': 'Offer',
        name: 'Free Plan',
        price: '0',
        priceCurrency: 'USD',
        description: '20 monthly audio summaries, perfect for small teams',
        availability: 'https://schema.org/InStock'
      },
      {
        '@type': 'Offer',
        name: 'Starter Plan',
        price: '9.00',
        priceCurrency: 'USD',
        description: 'Unlimited audio summaries for individuals',
        availability: 'https://schema.org/InStock'
      },
      {
        '@type': 'Offer',
        name: 'Pro Plan',
        price: '39.00',
        priceCurrency: 'USD',
        description: 'Unlimited summaries for teams up to 10 users',
        availability: 'https://schema.org/InStock'
      }
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '250',
      bestRating: '5',
      worstRating: '1'
    },
    featureList: [
      '59-second audio summaries',
      'AI-powered content extraction',
      'Slack integration',
      'Multi-language support',
      'Team collaboration',
      'Analytics dashboard',
      'Custom voice settings',
      'Enterprise security'
    ]
  }),

  breadcrumb: generateStructuredData('BreadcrumbList', {
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://biirbal.ai'
      }
    ]
  }),

  faq: generateStructuredData('FAQPage', {
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is Biirbal?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Biirbal is an AI-powered Slack bot that automatically converts shared links into 59-second audio summaries, helping teams stay informed without reading lengthy content.'
        }
      },
      {
        '@type': 'Question',
        name: 'How does Biirbal work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'When someone shares a link in your Slack channel, Biirbal automatically extracts the content, creates an AI-powered summary, and converts it to a 59-second audio clip that plays directly in Slack.'
        }
      },
      {
        '@type': 'Question',
        name: 'Is Biirbal free to use?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! Biirbal offers a free plan with 20 monthly audio summaries. Paid plans start at $9/month for unlimited summaries and advanced features.'
        }
      },
      {
        '@type': 'Question',
        name: 'How long does it take to set up Biirbal?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Setting up Biirbal takes less than 2 minutes. Simply install from the Slack App Directory and start sharing links to get instant audio summaries.'
        }
      },
      {
        '@type': 'Question',
        name: 'What types of content can Biirbal summarize?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Biirbal can summarize articles, blog posts, news stories, documentation, research papers, and most web content shared via links in Slack.'
        }
      }
    ]
  })
}