import { generateMetadata } from '@/lib/seo'
import { getBaseUrl } from '@/lib/config'

export const metadata = generateMetadata({
  title: 'Biirbal vs GetPocket: Complete 2025 Comparison Guide | Which Tool Wins?',
  description: 'Comprehensive comparison of Biirbal vs GetPocket for 2025. Compare features, pricing, AI summaries, Slack integration, and find the best content management tool for your workflow.',
  canonicalUrl: `${getBaseUrl()}/blog/biirbal-vs-getpocket`,
  keywords: [
    'biirbal vs getpocket',
    'content management tools',
    'ai audio summaries',
    'slack integration',
    'productivity tools 2025',
    'read later apps',
    'pocket alternative',
    'ai content intelligence',
    'team collaboration tools',
    'audio content summaries'
  ],
  openGraph: {
    type: 'article',
    publishedTime: '2025-04-02T00:00:00.000Z',
    authors: ['Biirbal Team'],
    tags: ['Productivity', 'AI Tools', 'Comparison', 'Slack', 'Content Management'],
    images: [
      {
        url: `${getBaseUrl()}/blog/thumbnails/biirbal-getpocket.svg`,
        width: 600,
        height: 300,
        alt: 'Biirbal vs GetPocket comparison illustration'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image'
  }
})
