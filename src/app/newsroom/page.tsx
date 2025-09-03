'use client'

import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Typography, Empty, Spin, Button, Card, Row, Col } from 'antd'
import { PlayCircleOutlined, ClockCircleOutlined, SoundOutlined } from '@ant-design/icons'
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
        padding: '50px 0 40px',
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
        maxWidth: 900,
        margin: '0 auto',
        padding: '40px 24px',
        background: '#fafafa'
      }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {articles.map((article) => (
              <Card 
                key={article.id} 
                hoverable
                style={{
                  borderRadius: 12,
                  border: '1px solid #f0f0f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'all 0.3s ease'
                }}
                bodyStyle={{ padding: '20px' }}
              >
                <Row gutter={[20, 16]} align="middle">
                  {/* Image */}
                  {article.ogImage && (
                    <Col xs={24} sm={8} md={6}>
                      <div style={{ 
                        height: 120, 
                        overflow: 'hidden', 
                        borderRadius: 8,
                        background: '#f5f5f5'
                      }}>
                        <img
                          src={article.ogImage}
                          alt={article.title}
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover',
                            transition: 'transform 0.3s ease'
                          }}
                        />
                      </div>
                    </Col>
                  )}
                  
                  {/* Content */}
                  <Col xs={24} sm={article.ogImage ? 16 : 24} md={article.ogImage ? 18 : 24}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
                      <Link 
                        href={`/newsroom/${article.slug}`}
                        style={{ textDecoration: 'none' }}
                      >
                        <Title 
                          level={4} 
                          style={{ 
                            margin: 0,
                            fontSize: '1.25rem',
                            lineHeight: 1.3,
                            color: '#1a1a1a',
                            fontWeight: 600,
                            marginBottom: 8
                          }}
                        >
                          {article.title}
                        </Title>
                      </Link>
                      
                      <Text 
                        style={{ 
                          fontSize: '0.95rem',
                          lineHeight: 1.5,
                          color: '#4a5568',
                          display: 'block'
                        }}
                        ellipsis={{ rows: 2 }}
                      >
                        {article.summary}
                      </Text>
                      
                      {/* Meta row */}
                      <Row justify="space-between" align="middle" style={{ marginTop: 'auto' }}>
                        <Col>
                          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            <span style={{ 
                              color: '#718096', 
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <ClockCircleOutlined />
                              59s
                            </span>
                            <span style={{ color: '#718096', fontSize: '0.85rem' }}>
                              {new Date(article.publishedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                            <span style={{ color: '#718096', fontSize: '0.85rem' }}>
                              {Math.round((article.wordCount || 0) / 100)}min read
                            </span>
                          </div>
                        </Col>
                        <Col>
                          <Link href={`/newsroom/${article.slug}`}>
                            <Button 
                              type="primary" 
                              icon={<SoundOutlined />}
                              style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                border: 'none',
                                borderRadius: 6,
                                height: 36,
                                fontSize: '0.9rem',
                                fontWeight: 500
                              }}
                            >
                              Listen
                            </Button>
                          </Link>
                        </Col>
                      </Row>
                    </div>
                  </Col>
                </Row>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}