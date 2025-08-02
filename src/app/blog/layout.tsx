import { generateMetadata } from '@/lib/seo'
import { getBaseUrl } from '@/lib/config'

export const metadata = generateMetadata({
  title: 'Biirbal Blog - AI Content Intelligence & Productivity Insights',
  description: 'Discover expert insights on AI content intelligence, audio summaries, Slack productivity, and team collaboration tools. Learn how to optimize your content workflow with Biirbal.',
  canonicalUrl: `${getBaseUrl()}/blog`,
  keywords: [
    'ai content intelligence',
    'audio summaries',
    'slack productivity',
    'team collaboration',
    'content management',
    'productivity tools',
    'ai insights',
    'biirbal blog',
    'workflow optimization',
    'content automation'
  ],
  openGraph: {
    type: 'website',
    images: [
      {
        url: `${getBaseUrl()}/blog/thumbnails/biirbal-getpocket.svg`,
        width: 600,
        height: 300,
        alt: 'Biirbal Blog - AI Content Intelligence Insights'
      }
    ]
  }
})

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
