import { generateMetadata } from '@/lib/seo'
import { getBaseUrl } from '@/lib/config'

export const metadata = generateMetadata({
  title: 'Audio Dashboard',
  description: 'View and manage all your processed links and AI-generated audio summaries in one place. Access your team\'s content intelligence dashboard.',
  keywords: [
    'dashboard',
    'audio summaries',
    'processed links',
    'content management',
    'team dashboard',
    'slack content',
    'ai summaries'
  ],
  noIndex: true, // Dashboard is private
  canonicalUrl: `${getBaseUrl()}/dashboard`
})

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}