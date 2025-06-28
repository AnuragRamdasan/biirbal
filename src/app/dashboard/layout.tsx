import { generateMetadata } from '@/lib/seo'

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
  canonicalUrl: 'https://biirbal.ai/dashboard'
})

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}