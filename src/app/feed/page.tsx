import { Metadata } from 'next'
import Link from 'next/link'
import { getLatestFeedArticles } from '@/lib/techmeme-processor'
import { feedMetadata } from './metadata'

export const metadata: Metadata = feedMetadata

interface FeedPageProps {
  searchParams: { page?: string }
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const page = parseInt(searchParams.page || '1')
  const articles = await getLatestFeedArticles(20)

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "Biirbal Tech Feed",
    "description": "Latest technology news with AI-generated audio summaries",
    "url": "https://biirbal.ai/feed",
    "author": {
      "@type": "Organization",
      "name": "Biirbal"
    },
    "publisher": {
      "@type": "Organization", 
      "name": "Biirbal",
      "logo": {
        "@type": "ImageObject",
        "url": "https://biirbal.ai/logo.png"
      }
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
        "item": "https://biirbal.ai"
      },
      {
        "@type": "ListItem", 
        "position": 2,
        "name": "Tech Feed",
        "item": "https://biirbal.ai/feed"
      }
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />
      
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
              <li className="text-gray-900 font-medium">
                Tech Feed
              </li>
            </ol>
          </nav>

          {/* Header */}
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Tech Feed
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl">
              Latest technology news from TechMeme with AI-generated 59-second audio summaries. 
              Stay updated with trending tech stories.
            </p>
          </header>

          {/* Articles Grid */}
          <main>
            {articles.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No articles available yet. Check back soon!</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {articles.map((article) => (
                  <article key={article.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                    {article.ogImage && (
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={article.ogImage}
                          alt={article.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    
                    <div className="p-6">
                      <h2 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
                        <Link 
                          href={`/feed/${article.slug}`}
                          className="hover:text-blue-600 transition-colors"
                        >
                          {article.title}
                        </Link>
                      </h2>
                      
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {article.summary}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <time dateTime={article.publishedAt.toISOString()}>
                          {new Date(article.publishedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </time>
                        
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          {article.wordCount} words
                        </span>
                      </div>
                      
                      <div className="mt-4">
                        <Link
                          href={`/feed/${article.slug}`}
                          className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Listen to Summary →
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  )
}