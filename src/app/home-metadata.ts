import { Metadata } from 'next'
import { generateMetadata, generateStructuredData } from '@/lib/seo'

export const metadata: Metadata = generateMetadata({
  title: 'Biirbal - AI-Powered Audio Summaries for Content Readers | Free Forever',
  description: 'Transform any article into a 59-second AI audio summary instantly. Save 90% of your reading time with intelligent content digests. Free forever plan with 20 monthly summaries. No credit card required. Trusted by 10,000+ content readers worldwide.',
  keywords: [
    'ai audio summaries',
    'content summarization ai',
    'article audio digest',
    'ai content intelligence',
    'reading productivity tool',
    'instant audio summaries',
    'text to speech articles',
    'content consumption tool',
    'ai article reader',
    'content productivity app',
    'ai summarization tool',
    'content automation software',
    'article extraction ai',
    'reading efficiency tools',
    'content management ai',
    'ai powered reading',
    'content time saver',
    'audio content digest',
    'smart content processing',
    'reading enhancement tool'
  ],
  canonicalUrl: 'https://www.biirbal.com/',
  ogImage: 'https://www.biirbal.com/og-home-2024.png',
  ogType: 'website'
})

export const homepageStructuredData = {
  organization: generateStructuredData('Organization', {
    name: 'Biirbal',
    url: 'https://www.biirbal.com',
    logo: 'https://www.biirbal.com/logo.png',
    description: 'AI-powered content intelligence providing instant audio summaries',
    foundingDate: '2024',
    sameAs: [
      'https://twitter.com/biirbal_ai',
      'https://linkedin.com/company/biirbal-ai',
      'https://github.com/biirbal/content-ai',
      'https://www.crunchbase.com/organization/biirbal',
      'https://www.producthunt.com/products/biirbal'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-555-BIIRBAL',
      contactType: 'customer service',
      email: 'support@biirbal.com',
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
    name: 'Biirbal - AI Content Intelligence for Readers',
    url: 'https://www.biirbal.com',
    description: 'The #1 AI platform that transforms any article into a 59-second audio summary. Save time, boost reading productivity, and never miss important content again.',
    publisher: {
      '@type': 'Organization',
      name: 'Biirbal'
    },
    potentialAction: [
      {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://www.biirbal.com/search?q={search_term_string}'
        },
        'query-input': 'required name=search_term_string'
      },
      {
        '@type': 'SubscribeAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://www.biirbal.com/pricing'
        },
        expectsAcceptanceOf: 'https://www.biirbal.com/terms'
      }
    ]
  }),

  softwareApplication: generateStructuredData('SoftwareApplication', {
    name: 'Biirbal Content AI',
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Web Browser',
    description: 'AI-powered content intelligence platform that transforms articles into 59-second audio summaries',
    url: 'https://www.biirbal.com',
    downloadUrl: 'https://www.biirbal.com/pricing',
    screenshot: 'https://www.biirbal.com/app-screenshot.png',
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
      'Browser extension',
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
        item: 'https://www.biirbal.com'
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
          text: 'Biirbal is an AI-powered content intelligence platform that automatically converts web links into 59-second audio summaries, helping teams stay informed without reading lengthy content.'
        }
      },
      {
        '@type': 'Question',
        name: 'How does Biirbal work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'When you share a link with Biirbal, it automatically extracts the content, creates an AI-powered summary, and converts it to a 59-second audio clip that you can listen to instantly.'
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
          text: 'Setting up Biirbal takes less than 2 minutes. Simply create an account and start sharing links to get instant audio summaries.'
        }
      },
      {
        '@type': 'Question',
        name: 'What types of content can Biirbal summarize?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Biirbal can summarize articles, blog posts, news stories, documentation, research papers, and most web content from any URL.'
        }
      }
    ]
  })
}