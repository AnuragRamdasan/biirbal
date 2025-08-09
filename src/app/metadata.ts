import { generateMetadata } from '@/lib/seo'
import { getBaseUrl } from '@/lib/config'

export const metadata = generateMetadata({
  title: 'Biirbal - #1 AI Content Intelligence for Readers | 10,000+ Active Users',
  description: 'The most trusted AI platform that instantly converts any article into 59-second audio summaries. Join 10,000+ readers saving 90% of their reading time. Free plan available - no credit card required.',
  keywords: [
    'ai content intelligence',
    'article audio summaries',
    'content summarization ai',
    'reading productivity tool',
    'ai content reader',
    'article automation tool',
    'instant audio summaries',
    'content consumption ai',
    'ai article processor',
    'content extraction ai',
    'reading productivity',
    'content time management',
    'ai text to speech',
    'reading efficiency software',
    'content management ai',
    'intelligent content processing',
    'content automation',
    'reading enhancement tool'
  ],
  ogType: 'website',
  canonicalUrl: getBaseUrl()
})