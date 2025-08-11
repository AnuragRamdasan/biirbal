import { Metadata } from 'next'
import { generateMetadata, generateStructuredData } from '@/lib/seo'

export const metadata: Metadata = generateMetadata({
  title: 'Success - Welcome to Biirbal! | Setup Complete',
  description: 'Welcome to Biirbal! Your AI-powered content platform is now ready to transform links into audio summaries. Start sharing links to get instant 59-second audio summaries.'
  keywords: [
    'biirbal setup complete',
    'content platform installed',
    'ai bot ready',
    'audio summaries active',
    'content integration success',
    'biirbal welcome',
    'setup confirmation',
    'content automation ready'
  ],
  canonicalUrl: 'https://www.biirbal.com/success',
  ogImage: 'https://www.biirbal.com/success-og.png',
  ogType: 'website',
  noIndex: true // Don't index success pages
})

export const successStructuredData = {
  webpage: generateStructuredData('WebPage', {
    name: 'Setup Success - Biirbal',
    description: 'Confirmation page for successful Biirbal content platform setup',
    url: 'https://www.biirbal.com/success',
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
          name: 'Success',
          item: 'https://www.biirbal.com/success'
        }
      ]
    }
  }),

  action: generateStructuredData('Action', {
    '@type': 'AchieveAction',
    name: 'Biirbal Setup Complete',
    description: 'Successfully installed and configured Biirbal AI content platform',
    result: {
      '@type': 'Product',
      name: 'Biirbal AI Content Platform',
      description: 'Active AI-powered content intelligence platform'
    }
  })
}