'use client'

import Link from 'next/link'
import { getLatestFeedArticles } from '@/lib/techmeme-processor'
import { Header } from '@/components/layout/Header'
import { Typography, Empty, Spin, Button } from 'antd'
import { PlayCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'

const { Title, Text, Paragraph } = Typography

interface FeedPageProps {
  searchParams: { page?: string }
}

export default function FeedPage({ searchParams }: FeedPageProps) {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await fetch('/api/newsroom/articles?limit=20')
        const data = await response.json()
        setArticles(data.articles || [])
      } catch (error) {
        console.error('Failed to fetch articles:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchArticles()
  }, [])

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "Biirbal Newsroom",
    "description": "Latest technology news with AI-generated audio summaries",
    "url": "https://www.biirbal.com/newsroom",
    "author": {
      "@type": "Organization",
      "name": "Biirbal"
    },
    "publisher": {
      "@type": "Organization", 
      "name": "Biirbal",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.biirbal.com/logo.png"
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
        "item": "https://www.biirbal.com"
      },
      {
        "@type": "ListItem", 
        "position": 2,
        "name": "Newsroom",
        "item": "https://www.biirbal.com/newsroom"
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
      
      <Header currentPage="newsroom" />
      
      {/* Modern Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '80px 0 60px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
          <Title 
            level={1} 
            style={{ 
              color: 'white', 
              fontSize: '3.5rem', 
              fontWeight: 700,
              margin: 0,
              lineHeight: 1.1
            }}
          >
            Newsroom
          </Title>
          <Paragraph 
            style={{ 
              color: 'rgba(255,255,255,0.9)', 
              fontSize: '1.25rem',
              margin: '20px 0 0',
              fontWeight: 300
            }}
          >
            Latest technology news with AI-generated 59-second audio summaries
          </Paragraph>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem' }}>
            {articles.length} articles available
          </Text>
        </div>
      </div>

      {/* Content Container */}
      <div style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '60px 24px',
        background: '#fafafa'
      }}>
        {/* Articles List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: '#666' }}>Loading articles...</div>
          </div>
        ) : articles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No articles available yet. Check back soon!"
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            {articles.map((article, index) => (
              <article 
                key={article.id} 
                style={{
                  background: 'white',
                  borderRadius: 12,
                  padding: 0,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  border: '1px solid #f0f0f0',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
                }}
              >
                {/* Image Header */}
                {article.ogImage && (
                  <div style={{ height: 240, overflow: 'hidden' }}>
                    <img
                      src={article.ogImage}
                      alt={article.title}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        transition: 'transform 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                      }}
                    />
                  </div>
                )}
                
                {/* Content */}
                <div style={{ padding: '32px' }}>
                  <Link 
                    href={`/newsroom/${article.slug}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <Title 
                      level={2} 
                      style={{ 
                        margin: 0,
                        fontSize: '1.75rem',
                        lineHeight: 1.3,
                        color: '#1a1a1a',
                        fontWeight: 600,
                        marginBottom: 16
                      }}
                    >
                      {article.title}
                    </Title>
                  </Link>
                  
                  <Paragraph 
                    style={{ 
                      fontSize: '1.1rem',
                      lineHeight: 1.6,
                      color: '#4a5568',
                      margin: '16px 0 24px',
                      fontWeight: 300
                    }}
                  >
                    {article.summary}
                  </Paragraph>
                  
                  {/* Meta Info */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: 24,
                    padding: '16px 0',
                    borderTop: '1px solid #f0f0f0'
                  }}>
                    <div style={{ display: 'flex', gap: 24 }}>
                      <span style={{ 
                        color: '#718096', 
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <ClockCircleOutlined />
                        59 sec listen
                      </span>
                      <span style={{ color: '#718096', fontSize: '0.9rem' }}>
                        {new Date(article.publishedAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      <span style={{ color: '#718096', fontSize: '0.9rem' }}>
                        {article.wordCount} words
                      </span>
                    </div>
                  </div>
                  
                  {/* CTA Button */}
                  <Link href={`/newsroom/${article.slug}`}>
                    <Button 
                      type="primary" 
                      size="large"
                      icon={<PlayCircleOutlined />}
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        borderRadius: 8,
                        height: 48,
                        fontSize: '1rem',
                        fontWeight: 500,
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                      }}
                      block
                    >
                      Listen to Summary
                    </Button>
                  </Link>
                </div>
              </article>
            ))
        </div>
      </div>
    </>
  )
}