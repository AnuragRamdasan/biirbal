import { generateMetadata } from '@/lib/seo'
import { getBaseUrl } from '@/lib/config'

export const metadata = generateMetadata({
  title: 'Biirbal vs GetPocket: Which Tool Fits Your Workflow?',
  description: 'A detailed comparison of Biirbal and GetPocket to help you choose the best content management solution.',
  canonicalUrl: `${getBaseUrl()}/blog/biirbal-vs-getpocket`
})
