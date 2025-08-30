import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getDbClient } from '@/lib/db'
import { Header } from '@/components/layout/Header'

interface ArticlePageProps {
  params: { slug: string }
}

async function getArticle(slug: string) {
  const db = await getDbClient()
  
  const article = await db.feedArticle.findUnique({
    where: { 
      slug,
      isPublished: true 
    }
  })

  return article
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const article = await getArticle(params.slug)

  if (!article) {
    return {
      title: 'Article Not Found',
      description: 'The requested article could not be found.'
    }
  }

  return {
    title: `${article.title} - Audio Summary | Biirbal`,
    description: article.summary || `Listen to an AI-generated audio summary of: ${article.title}`,
    keywords: [
      'audio summary',
      'tech news',
      'ai generated', 
      ...article.tags,
      article.title.toLowerCase()
    ],
    openGraph: {
      title: article.title,
      description: article.summary || `Listen to an AI-generated audio summary of: ${article.title}`,
      type: 'article',
      publishedTime: article.publishedAt.toISOString(),
      url: `https://www.biirbal.com/newsroom/${article.slug}`,
      images: article.ogImage ? [
        {
          url: article.ogImage,
          width: 1200,
          height: 630,
          alt: article.title
        }
      ] : undefined
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.summary || `Listen to an AI-generated audio summary of: ${article.title}`,
      images: article.ogImage ? [article.ogImage] : undefined
    },
    alternates: {
      canonical: `https://www.biirbal.com/newsroom/${article.slug}`
    }
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const article = await getArticle(params.slug)

  if (!article) {
    notFound()
  }

  const articleStructuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.summary,
    "url": `https://www.biirbal.com/newsroom/${article.slug}`,
    "datePublished": article.publishedAt.toISOString(),
    "dateModified": article.updatedAt.toISOString(),
    "author": {
      "@type": "Organization",
      "name": "Biirbal AI"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Biirbal",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.biirbal.com/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://www.biirbal.com/newsroom/${article.slug}`
    },
    "image": article.ogImage ? {
      "@type": "ImageObject",
      "url": article.ogImage
    } : undefined,
    "wordCount": article.wordCount,
    "keywords": article.tags.join(', ')
  }

  const audioObjectStructuredData = {
    "@context": "https://schema.org",
    "@type": "AudioObject",
    "name": `Audio Summary: ${article.title}`,
    "description": `AI-generated audio summary of ${article.title}`,
    "contentUrl": article.audioFileUrl,
    "duration": "PT59S",
    "encodingFormat": "audio/mpeg",
    "associatedArticle": {
      "@type": "Article",
      "headline": article.title,
      "url": article.url
    }
  }

  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://www.biirbal.com"
      },
      {
        "@type": "ListItem",
        "position": 2, 
        "name": "Newsroom",
        "item": "https://www.biirbal.com/feed"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": article.title,
        "item": `https://www.biirbal.com/newsroom/${article.slug}`
      }
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleStructuredData) }}
      />
      <script
        type="application/ld+json" 
        dangerouslySetInnerHTML={{ __html: JSON.stringify(audioObjectStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />

      <Header currentPage="newsroom" />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Breadcrumbs */}
          <nav className="mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm text-gray-600">
              <li>
                <Link href="/" className="hover:text-blue-600">
                  Home
                </Link>
              </li>
              <li>
                <span className="mx-2">/</span>
              </li>
              <li>
                <Link href="/newsroom" className="hover:text-blue-600">
                  Newsroom
                </Link>
              </li>
              <li>
                <span className="mx-2">/</span>
              </li>
              <li className="text-gray-900 font-medium line-clamp-1">
                {article.title}
              </li>
            </ol>
          </nav>

          <article className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Article Header */}
            <header className="p-8 border-b">
              {article.ogImage && (
                <div className="aspect-video mb-6 rounded-lg overflow-hidden">
                  <img
                    src={article.ogImage}
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {article.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
                <time dateTime={article.publishedAt.toISOString()}>
                  Published {new Date(article.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long', 
                    day: 'numeric'
                  })}
                </time>
                
                <span>•</span>
                <span>{article.wordCount} words</span>
                
                <span>•</span>
                <span>~59 second listen</span>
              </div>

              {article.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </header>

            {/* Audio Player */}
            <section className="p-8 bg-blue-50 border-b">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                🎧 Listen to AI Summary
              </h2>
              <p className="text-gray-600 mb-4">
                {article.summary}
              </p>
              
              {article.audioFileUrl && (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <audio 
                    controls 
                    preload="metadata"
                    className="w-full"
                    aria-label={`Audio summary of ${article.title}`}
                  >
                    <source src={article.audioFileUrl} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
            </section>

            {/* Article Content */}
            <section className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Full Article
                </h3>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Read Original →
                </a>
              </div>
              
              <div className="prose prose-lg max-w-none text-gray-700">
                {article.extractedText?.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          </article>

          {/* Back to Feed */}
          <div className="mt-8 text-center">
            <Link
              href="/newsroom"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Newsroom
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}