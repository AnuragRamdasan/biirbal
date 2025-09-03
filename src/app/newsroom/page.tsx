import { Metadata } from 'next'
import Link from 'next/link'
import { getLatestFeedArticles } from '@/lib/techmeme-processor'
import { newsroomMetadata } from './metadata'
import { Header } from '@/components/layout/Header'
import { Row, Col, Card, Typography, Space, Empty } from 'antd'
import { SoundOutlined, GlobalOutlined, CalendarOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

export const metadata: Metadata = newsroomMetadata

interface FeedPageProps {
  searchParams: { page?: string }
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const page = parseInt(searchParams.page || '1')
  const articles = await getLatestFeedArticles(20)

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
      <div style={{ 
        padding: '16px 24px', 
        maxWidth: 1400, 
        margin: '0 auto'
      }}>
        {/* Compact Header */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={3} style={{ margin: 0, fontSize: 18 }}>
                <Space size="small">
                  <GlobalOutlined />
                  Newsroom
                </Space>
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Latest technology news with AI-generated 59-second audio summaries
              </Text>
            </Col>
            <Col>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1890ff' }}>
                  {articles.length}
                </div>
                <Text type="secondary" style={{ fontSize: 10 }}>Articles</Text>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Articles List - Row-based Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {articles.length === 0 ? (
            <Card>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No articles available yet. Check back soon!"
                style={{ padding: '20px 0' }}
              />
            </Card>
          ) : (
            articles.map((article) => (
              <Card key={article.id} size="small" hoverable>
                <Row gutter={16} align="middle">
                  {article.ogImage && (
                    <Col xs={24} sm={6} md={4}>
                      <div style={{ aspectRatio: '16/9', overflow: 'hidden', borderRadius: 6 }}>
                        <img
                          src={article.ogImage}
                          alt={article.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          loading="lazy"
                        />
                      </div>
                    </Col>
                  )}
                  
                  <Col xs={24} sm={article.ogImage ? 18 : 24} md={article.ogImage ? 20 : 24}>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Link href={`/newsroom/${article.slug}`}>
                        <Title level={5} style={{ margin: 0, fontSize: 14, lineHeight: '1.4' }}>
                          {article.title}
                        </Title>
                      </Link>
                      
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }} ellipsis={{ rows: 2 }}>
                        {article.summary}
                      </Text>
                      
                      <Row justify="space-between" align="middle">
                        <Col>
                          <Space size={8}>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              <CalendarOutlined style={{ marginRight: 4 }} />
                              {new Date(article.publishedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {article.wordCount} words
                            </Text>
                          </Space>
                        </Col>
                        <Col>
                          <Link href={`/newsroom/${article.slug}`}>
                            <Space size={4}>
                              <SoundOutlined style={{ color: '#1890ff' }} />
                              <Text style={{ fontSize: 12, color: '#1890ff' }}>Listen</Text>
                            </Space>
                          </Link>
                        </Col>
                      </Row>
                    </Space>
                  </Col>
                </Row>
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  )
}