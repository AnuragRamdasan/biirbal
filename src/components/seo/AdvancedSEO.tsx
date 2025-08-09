'use client'

import Head from 'next/head'
import Script from 'next/script'
import { generatePerformanceHints } from '@/lib/performance-seo'

interface AdvancedSEOProps {
  title: string
  description: string
  keywords?: string[]
  canonicalUrl: string
  ogImage?: string
  structuredData?: object
  pageType?: 'home' | 'pricing' | 'blog' | 'contact' | 'article'
  breadcrumbs?: Array<{ name: string; url: string }>
  author?: string
  publishedTime?: string
  modifiedTime?: string
  locale?: string
  alternateLocales?: Array<{ locale: string; url: string }>
}

export default function AdvancedSEO({
  title,
  description,
  keywords = [],
  canonicalUrl,
  ogImage = 'https://www.biirbal.com/og-image.png',
  structuredData,
  pageType = 'home',
  breadcrumbs = [],
  author = 'Biirbal Team',
  publishedTime,
  modifiedTime,
  locale = 'en_US',
  alternateLocales = []
}: AdvancedSEOProps) {
  const performanceHints = generatePerformanceHints()
  
  // Generate enhanced Open Graph data
  const ogData = {
    'og:title': title,
    'og:description': description,
    'og:url': canonicalUrl,
    'og:image': ogImage,
    'og:image:width': '1200',
    'og:image:height': '630',
    'og:image:alt': title,
    'og:type': pageType === 'article' ? 'article' : 'website',
    'og:site_name': 'Biirbal',
    'og:locale': locale,
    ...(publishedTime && { 'article:published_time': publishedTime }),
    ...(modifiedTime && { 'article:modified_time': modifiedTime }),
    ...(author && { 'article:author': author })
  }

  // Generate Twitter Card data
  const twitterData = {
    'twitter:card': 'summary_large_image',
    'twitter:site': '@biirbal_ai',
    'twitter:creator': '@biirbal_ai',
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': ogImage,
    'twitter:image:alt': title
  }

  // Generate breadcrumb structured data
  const breadcrumbStructuredData = breadcrumbs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((breadcrumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: breadcrumb.name,
      item: breadcrumb.url
    }))
  } : null

  // Generate FAQ structured data for key pages
  const faqStructuredData = pageType === 'home' ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is Biirbal?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Biirbal is an AI-powered Slack bot that automatically converts shared links into 59-second audio summaries, helping teams stay informed without reading lengthy content.'
        }
      },
      {
        '@type': 'Question', 
        name: 'How does Biirbal work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'When someone shares a link in your Slack channel, Biirbal automatically extracts the content, creates an AI-powered summary, and converts it to a 59-second audio clip that plays directly in Slack.'
        }
      },
      {
        '@type': 'Question',
        name: 'Is Biirbal free to use?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! Biirbal offers a free plan with 20 monthly audio summaries. Paid plans start at $9/month for unlimited summaries and advanced features.'
        }
      }
    ]
  } : null

  // Combine all structured data
  const allStructuredData = [
    structuredData,
    breadcrumbStructuredData,
    faqStructuredData
  ].filter(Boolean)

  return (
    <>
      <Head>
        {/* Basic Meta Tags */}
        <title>{title}</title>
        <meta name="description" content={description} />
        {keywords.length > 0 && (
          <meta name="keywords" content={keywords.join(', ')} />
        )}
        
        {/* Canonical URL */}
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph Meta Tags */}
        {Object.entries(ogData).map(([property, content]) => (
          <meta key={property} property={property} content={content} />
        ))}
        
        {/* Twitter Card Meta Tags */}
        {Object.entries(twitterData).map(([name, content]) => (
          <meta key={name} name={name} content={content} />
        ))}
        
        {/* Alternate Language Links */}
        {alternateLocales.map(({ locale: altLocale, url }) => (
          <link key={altLocale} rel="alternate" hrefLang={altLocale} href={url} />
        ))}
        
        {/* Performance Optimization */}
        {performanceHints.preconnect.map((href) => (
          <link key={href} rel="preconnect" href={href} />
        ))}
        
        {performanceHints.dnsPrefetch.map((href) => (
          <link key={href} rel="dns-prefetch" href={href} />
        ))}
        
        {performanceHints.preload.map((resource) => (
          <link 
            key={resource.href}
            rel="preload" 
            href={resource.href}
            as={resource.as}
            type={resource.type}
            {...(resource.crossorigin && { crossOrigin: resource.crossorigin })}
          />
        ))}
        
        {performanceHints.prefetch.map((href) => (
          <link key={href} rel="prefetch" href={href} />
        ))}
        
        {/* Mobile Optimizations */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="msapplication-TileColor" content="#6366f1" />
        
        {/* Apple Optimizations */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Biirbal" />
        
        {/* Additional SEO Meta Tags */}
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
        <meta name="googlebot" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
        <meta name="author" content={author} />
        <meta name="generator" content="Next.js" />
        <meta name="application-name" content="Biirbal" />
        <meta name="referrer" content="origin-when-cross-origin" />
        
        {/* Rich Snippets */}
        <meta name="rating" content="4.9" />
        <meta name="price" content="Free - $99" />
        <meta name="priceCurrency" content="USD" />
        <meta name="availability" content="https://schema.org/InStock" />
        
        {/* Social Media Optimizations */}
        <meta property="fb:app_id" content="your-facebook-app-id" />
        <meta name="pinterest-rich-pin" content="true" />
        
        {/* Security Headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
      </Head>
      
      {/* Structured Data Scripts */}
      {allStructuredData.map((data, index) => (
        <Script
          key={index}
          id={`structured-data-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(data, null, 0)
          }}
        />
      ))}
      
      {/* Critical CSS Inline */}
      <style jsx global>{`
        /* Critical CSS for above-the-fold content */
        .hero-section {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 60vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .loading-skeleton {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200px 100%;
          animation: loading 1.5s infinite;
        }
        
        @keyframes loading {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
        
        /* Optimize font loading */
        @font-face {
          font-family: 'Inter';
          font-style: normal;
          font-weight: 400;
          font-display: swap;
          src: url('/fonts/inter-regular.woff2') format('woff2');
        }
      `}</style>
    </>
  )
}