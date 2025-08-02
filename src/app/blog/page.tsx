 'use client'
import Image from 'next/image'
import Link from 'next/link'
import { Card, Row, Col, Typography, Space } from 'antd'
import Layout from '@/components/layout/Layout'

const { Title, Paragraph } = Typography

export default function BlogPage() {
  return (
    <Layout currentPage="blog" showHeader>
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-center mb-16">
            <Title level={1} className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Blog
            </Title>
            <Paragraph className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Discover insights on AI content intelligence, productivity tips, and the latest in audio summarization technology.
            </Paragraph>
          </div>

          <Row gutter={[32, 32]} justify="start">
            <Col xs={24} sm={12} lg={8}>
              <Link href="/blog/biirbal-vs-getpocket" className="block h-full">
                <Card
                  hoverable
                  className="h-full shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-white dark:bg-gray-700 rounded-xl overflow-hidden"
                  cover={
                    <div className="relative overflow-hidden">
                      <Image
                        src="/blog/thumbnails/biirbal-getpocket.svg"
                        alt="Comparison between Biirbal and GetPocket"
                        width={400}
                        height={225}
                        className="transition-transform duration-300 hover:scale-105"
                      />
                      <div className="absolute top-4 left-4">
                        <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                          Comparison
                        </span>
                      </div>
                    </div>
                  }
                >
                  <Space direction="vertical" size="small" className="w-full">
                    <Card.Meta
                      title={
                        <span className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                          Biirbal vs GetPocket: Which Tool Fits Your Workflow?
                        </span>
                      }
                      description={
                        <span className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                          A detailed comparison of Biirbal and GetPocket to help you choose the best content management solution.
                        </span>
                      }
                    />
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-600">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        April 2, 2025
                      </span>
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        5 min read
                      </span>
                    </div>
                  </Space>
                </Card>
              </Link>
            </Col>
          </Row>
        </div>
      </div>
    </Layout>
  )
}
