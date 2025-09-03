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

async function getSimilarArticles(currentSlug: string, tags: string[], limit: number = 4) {
  if (tags.length === 0) return []
  
  const db = await getDbClient()
  
  const articles = await db.feedArticle.findMany({
    where: {
      slug: { not: currentSlug },
      isPublished: true,
      audioFileUrl: { not: null },
      OR: tags.map(tag => ({
        tags: { has: tag }
      }))
    },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      ogImage: true,
      publishedAt: true,
      wordCount: true,
      tags: true
    },
    orderBy: { publishedAt: 'desc' },
    take: limit
  })
  
  return articles
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

  const similarArticles = await getSimilarArticles(article.slug, article.tags, 4)

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
        "item": "https://www.biirbal.com/newsroom"
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
      
      {/* Clean Medium-style layout */}
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto">
          {/* Navigation */}
          <nav className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Link href="/" className="hover:text-gray-900 transition-colors">
                Home
              </Link>
              <span>/</span>
              <Link href="/newsroom" className="hover:text-gray-900 transition-colors">
                Newsroom
              </Link>
            </div>
          </nav>

          <article className="px-6 py-12">
            {/* Article Header */}
            <header className="mb-12 text-center max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                {article.title}
              </h1>
              
              <div className="flex flex-wrap items-center justify-center gap-4 text-gray-600 mb-8">
                <time 
                  dateTime={article.publishedAt.toISOString()}
                  className="text-sm"
                >
                  {new Date(article.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long', 
                    day: 'numeric'
                  })}
                </time>
                <span className="text-gray-400">•</span>
                <span className="text-sm">59 second listen</span>
              </div>

              {article.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </header>

            {/* Audio Player Section - Top Priority */}
            {article.audioFileUrl && (
              <section className="max-w-2xl mx-auto mb-12">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 border border-blue-100">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900">
                      🎧 Audio Summary
                    </h2>
                    <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
                      59 seconds
                    </span>
                  </div>
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <audio 
                      controls 
                      preload="metadata"
                      className="w-full"
                      style={{
                        height: '54px',
                        borderRadius: '8px'
                      }}
                      aria-label={`Audio summary of ${article.title}`}
                    >
                      <source src={article.audioFileUrl} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                </div>
              </section>
            )}

            {/* Hero Image */}
            {article.ogImage && (
              <div className="mb-12">
                <img
                  src={article.ogImage}
                  alt={article.title}
                  className="w-full max-w-4xl mx-auto rounded-lg shadow-sm"
                />
              </div>
            )}

            {/* Summary Section */}
            <section className="max-w-2xl mx-auto mb-12">
              <div className="bg-gray-50 rounded-xl p-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Summary
                </h2>
                <p className="text-lg text-gray-700 leading-relaxed">
                  {article.summary}
                </p>
              </div>
            </section>

            {/* Read Original CTA */}
            <section className="max-w-2xl mx-auto mb-16">
              <div className="text-center p-8 bg-gray-50 rounded-xl">
                <h3 className="text-xl font-medium text-gray-900 mb-4">
                  Want the full story?
                </h3>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Read Original Article →
                </a>
                <p className="text-sm text-gray-600 mt-3">
                  Opens in new tab
                </p>
              </div>
            </section>

            {/* Similar Articles */}
            {similarArticles.length > 0 && (
              <section className="max-w-4xl mx-auto">
                <div className="border-t border-gray-200 pt-12">
                  <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                    More like this
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {similarArticles.map((similar) => (
                      <Link 
                        key={similar.id} 
                        href={`/newsroom/${similar.slug}`}
                        className="group block"
                      >
                        <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300">
                          {similar.ogImage && (
                            <div className="aspect-video mb-4 rounded-lg overflow-hidden">
                              <img
                                src={similar.ogImage}
                                alt={similar.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}
                          
                          <h3 className="text-lg font-semibold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors leading-tight">
                            {similar.title}
                          </h3>
                          
                          <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-2">
                            {similar.summary}
                          </p>
                          
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>
                              {new Date(similar.publishedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              59s listen
                            </span>
                          </div>
                          
                          {similar.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {similar.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Back Navigation */}
            <div className="max-w-2xl mx-auto mt-16 text-center">
              <Link
                href="/newsroom"
                className="inline-flex items-center text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                ← Back to Newsroom
              </Link>
            </div>
          </article>
        </div>
      </div>
    </>
  )
}