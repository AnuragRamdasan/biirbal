'use client'

import Head from 'next/head'
import Script from 'next/script'
import { SEOConfig } from '@/lib/seo'

interface SEOHeadProps extends SEOConfig {
  children?: React.ReactNode
  structuredData?: any[]
  breadcrumbs?: Array<{ name: string; url: string }>
  geoData?: {
    country?: string
    region?: string
    city?: string
    coordinates?: { lat: number; lng: number }
  }
}

export default function SEOHead({
  title,
  description,
  keywords = [],
  ogImage,
  ogType = 'website',
  twitterCard = 'summary_large_image',
  canonicalUrl,
  noIndex = false,
  structuredData = [],
  breadcrumbs = [],
  geoData,
  children
}: SEOHeadProps) {
  const baseUrl = 'https://biirbal.ai'
  const fullTitle = title?.includes('Biirbal') ? title : `${title} | Biirbal`
  const fullOgImage = ogImage?.startsWith('http') ? ogImage : `${baseUrl}${ogImage || '/og-image.png'}`
  const fullCanonicalUrl = canonicalUrl?.startsWith('http') ? canonicalUrl : `${baseUrl}${canonicalUrl || ''}`

  // Generate breadcrumb structured data
  const breadcrumbStructuredData = breadcrumbs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`
    }))
  } : null

  return (
    <>
      <Head>
        {/* Basic Meta Tags */}
        <title>{fullTitle}</title>
        <meta name="description" content={description} />
        {keywords.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}
        
        {/* Canonical URL */}
        {canonicalUrl && <link rel="canonical" href={fullCanonicalUrl} />}
        
        {/* Robots */}
        <meta name="robots" content={noIndex ? 'noindex,nofollow' : 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1'} />
        
        {/* Open Graph */}
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content={ogType} />
        <meta property="og:url" content={fullCanonicalUrl} />
        <meta property="og:image" content={fullOgImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={title} />
        <meta property="og:site_name" content="Biirbal" />
        <meta property="og:locale" content="en_US" />
        
        {/* Twitter Cards */}
        <meta name="twitter:card" content={twitterCard} />
        <meta name="twitter:title" content={fullTitle} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={fullOgImage} />
        <meta name="twitter:image:alt" content={title} />
        <meta name="twitter:site" content="@biirbal" />
        <meta name="twitter:creator" content="@biirbal" />
        
        {/* Geographic Data */}
        {geoData?.country && <meta name="geo.country" content={geoData.country} />}
        {geoData?.region && <meta name="geo.region" content={geoData.region} />}
        {geoData?.city && <meta name="geo.city" content={geoData.city} />}
        {geoData?.coordinates && (
          <>
            <meta name="geo.position" content={`${geoData.coordinates.lat};${geoData.coordinates.lng}`} />
            <meta name="ICBM" content={`${geoData.coordinates.lat}, ${geoData.coordinates.lng}`} />
          </>
        )}
        
        {/* Performance Hints */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.openai.com" />
        <link rel="dns-prefetch" href="https://slack.com" />
        
        {/* Additional Meta Tags */}
        <meta name="application-name" content="Biirbal" />
        <meta name="apple-mobile-web-app-title" content="Biirbal" />
        <meta name="msapplication-TileColor" content="#6366f1" />
        <meta name="theme-color" content="#6366f1" />
        
        {children}
      </Head>

      {/* Structured Data Scripts */}
      {breadcrumbStructuredData && (
        <Script
          id="breadcrumb-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbStructuredData)
          }}
        />
      )}
      
      {structuredData.map((data, index) => (
        <Script
          key={`structured-data-${index}`}
          id={`structured-data-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(data)
          }}
        />
      ))}
    </>
  )
}