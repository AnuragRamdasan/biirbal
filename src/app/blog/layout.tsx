import { generateMetadata } from '@/lib/seo'
import { getBaseUrl } from '@/lib/config'

export const metadata = generateMetadata({
  title: 'Blog - Biirbal',
  description: 'Read our latest articles and insights on AI content intelligence, productivity, and more.',
  canonicalUrl: `${getBaseUrl()}/blog`
})

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
