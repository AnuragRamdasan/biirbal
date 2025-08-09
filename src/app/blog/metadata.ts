import { Metadata } from 'next'
import { generateMetadata, generateStructuredData } from '@/lib/seo'

export const metadata: Metadata = generateMetadata({
  title: 'Biirbal AI Blog - Slack Productivity Tips & Content Intelligence Insights',
  description: 'Discover expert insights on AI-powered content intelligence, Slack productivity hacks, audio summarization trends, and team collaboration strategies. Stay ahead with Biirbal.',
  keywords: [
    'ai slack productivity',
    'content intelligence blog',
    'slack productivity tips',
    'audio summarization trends',
    'team collaboration insights',
    'ai automation guides',
    'slack bot tutorials',
    'workplace productivity blog',
    'content management tips',
    'ai tools reviews',
    'slack integration guides',
    'team efficiency blog',
    'workplace automation',
    'content consumption strategies'
  ],
  canonicalUrl: 'https://www.biirbal.com/blog',
  ogImage: 'https://www.biirbal.com/blog-og.png',
  ogType: 'website'
})

export const blogStructuredData = {
  blog: generateStructuredData('Blog', {
    name: 'Biirbal AI Blog',
    description: 'Expert insights on AI-powered content intelligence and Slack productivity',
    url: 'https://www.biirbal.com/blog',
    publisher: {
      '@type': 'Organization',
      name: 'Biirbal',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.biirbal.com/logo.png'
      }
    },
    mainEntity: {
      '@type': 'ItemList',
      name: 'Blog Posts',
      description: 'Latest articles about AI content intelligence and productivity'
    }
  }),

  breadcrumb: generateStructuredData('BreadcrumbList', {
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
        name: 'Blog',
        item: 'https://www.biirbal.com/blog'
      }
    ]
  })
}