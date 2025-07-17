import { generateMetadata } from '@/lib/seo'
import { getBaseUrl } from '@/lib/config'

export const metadata = generateMetadata({
  title: 'Pricing Plans - Choose Your Plan',
  description: 'Transparent pricing for biirbal.ai. Start with our free trial, then choose from Starter ($9.99), Pro ($29.99), or Enterprise ($99.99) plans. 7-day free trial included.',
  keywords: [
    'pricing',
    'plans',
    'subscription',
    'slack bot pricing',
    'ai audio summaries cost',
    'team collaboration pricing',
    'free trial',
    'enterprise pricing'
  ],
  canonicalUrl: `${getBaseUrl()}/pricing`
})

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}