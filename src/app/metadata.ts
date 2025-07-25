import { generateMetadata } from '@/lib/seo'
import { getBaseUrl } from '@/lib/config'

export const metadata = generateMetadata({
  title: 'AI-Powered Slack Content Intelligence',
  description: 'Transform Slack links into 59-second audio summaries. Never miss important content again with Biirbal - the AI-powered content intelligence platform for teams.',
  keywords: [
    'slack bot',
    'ai content summarization',
    'audio summaries', 
    'productivity tools',
    'team collaboration',
    'content intelligence',
    'slack automation',
    'text to speech',
    'link summarization',
    'slack productivity',
    'ai productivity',
    'team efficiency',
    'content consumption',
    'slack integration'
  ],
  ogType: 'website',
  canonicalUrl: getBaseUrl()
})