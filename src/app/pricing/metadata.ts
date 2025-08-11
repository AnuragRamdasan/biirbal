import { Metadata } from 'next'
import { generateMetadata, generateStructuredData } from '@/lib/seo'

export const metadata: Metadata = generateMetadata({
  title: 'Biirbal Pricing - Free AI Content Intelligence | Plans Start at $9/month',
  description: 'Get Biirbal AI content platform pricing. Free forever plan with 20 monthly audio summaries. Pro plans from $9/month with unlimited summaries. Join 10,000+ readers saving 90% reading time. No setup fees.',
  keywords: [
    'biirbal pricing',
    'content automation pricing',
    'ai summarization pricing',
    'team collaboration tools pricing',
    'content automation cost',
    'audio summary pricing',
    'content intelligence pricing',
    'enterprise content solutions',
    'team productivity pricing',
    'content integration cost'
  ],
  canonicalUrl: 'https://www.biirbal.com/pricing',
  ogImage: 'https://www.biirbal.com/pricing-og.png',
  ogType: 'website'
})

export const pricingStructuredData = {
  product: generateStructuredData('Product', {
    name: 'Biirbal AI Content Platform',
    description: 'AI-powered audio summaries for web content with flexible pricing plans',
    brand: { '@type': 'Brand', name: 'Biirbal' },
    offers: [
      {
        '@type': 'Offer',
        name: 'Free Plan',
        price: '0',
        priceCurrency: 'USD',
        description: '20 monthly audio summaries, 1 user',
        availability: 'https://schema.org/InStock',
        priceValidUntil: '2025-12-31'
      },
      {
        '@type': 'Offer', 
        name: 'Starter Plan',
        price: '9.00',
        priceCurrency: 'USD',
        description: 'Unlimited audio summaries, 1 user, priority support',
        availability: 'https://schema.org/InStock',
        priceValidUntil: '2025-12-31'
      },
      {
        '@type': 'Offer',
        name: 'Pro Plan', 
        price: '39.00',
        priceCurrency: 'USD',
        description: 'Unlimited summaries, up to 10 users, advanced analytics',
        availability: 'https://schema.org/InStock',
        priceValidUntil: '2025-12-31'
      },
      {
        '@type': 'Offer',
        name: 'Business Plan',
        price: '99.00', 
        priceCurrency: 'USD',
        description: 'Unlimited summaries, unlimited users, enterprise features',
        availability: 'https://schema.org/InStock',
        priceValidUntil: '2025-12-31'
      }
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '250',
      bestRating: '5',
      worstRating: '1'
    }
  }),
  
  faq: generateStructuredData('FAQPage', {
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How much does Biirbal cost?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Biirbal offers a free plan with 20 monthly summaries. Paid plans start at $9/month for unlimited summaries.'
        }
      },
      {
        '@type': 'Question', 
        name: 'Can I upgrade or downgrade my plan?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, you can upgrade or downgrade your plan at any time from your dashboard. Changes take effect immediately.'
        }
      },
      {
        '@type': 'Question',
        name: 'Is there a free trial?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, our free plan includes 20 monthly audio summaries with no time limit. No credit card required.'
        }
      },
      {
        '@type': 'Question',
        name: 'What payment methods do you accept?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'We accept all major credit cards through Stripe, including Visa, Mastercard, American Express, and Discover.'
        }
      }
    ]
  })
}