import { Metadata } from 'next'

export const feedMetadata: Metadata = {
  title: 'Tech Feed - AI-Generated Audio Summaries | Biirbal',
  description: 'Listen to the latest tech news with AI-generated 59-second audio summaries from TechMeme. Stay updated with trending technology stories.',
  keywords: [
    'tech news',
    'audio summaries', 
    'ai generated',
    'technology feed',
    'techmeme',
    'startup news',
    'tech updates',
    'audio news',
    'tech podcast'
  ],
  openGraph: {
    title: 'Tech Feed - AI Audio Summaries',
    description: 'Latest tech news as 59-second AI audio summaries',
    type: 'website',
    url: 'https://biirbal.ai/feed'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tech Feed - AI Audio Summaries', 
    description: 'Latest tech news as 59-second AI audio summaries'
  },
  alternates: {
    canonical: 'https://biirbal.ai/feed'
  }
}