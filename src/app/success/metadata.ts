import { Metadata } from 'next'
import { generateMetadata, generateStructuredData } from '@/lib/seo'

export const metadata: Metadata = generateMetadata({
  title: 'Success - Welcome to Biirbal! | Setup Complete',
  description: 'Welcome to Biirbal! Your AI-powered Slack bot is now ready to transform links into audio summaries. Start sharing links in your Slack channels to get instant 59-second audio summaries.',
  keywords: [
    'biirbal setup complete',
    'slack bot installed',
    'ai bot ready',
    'audio summaries active',
    'slack integration success',
    'biirbal welcome',
    'setup confirmation',
    'slack automation ready'
  ],
  canonicalUrl: 'https://biirbal.ai/success',
  ogImage: 'https://biirbal.ai/success-og.png',
  ogType: 'website',
  noIndex: true // Don't index success pages
})

export const successStructuredData = {
  webpage: generateStructuredData('WebPage', {
    name: 'Setup Success - Biirbal',
    description: 'Confirmation page for successful Biirbal Slack bot installation and setup',
    url: 'https://biirbal.ai/success',
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
          name: 'Success',
          item: 'https://biirbal.ai/success'
        }
      ]
    }
  }),

  action: generateStructuredData('Action', {
    '@type': 'AchieveAction',
    name: 'Biirbal Setup Complete',
    description: 'Successfully installed and configured Biirbal AI Slack bot',
    result: {
      '@type': 'Product',
      name: 'Biirbal AI Slack Bot',
      description: 'Active AI-powered content intelligence for Slack'
    }
  })
}