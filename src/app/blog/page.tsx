 'use client'
import Image from 'next/image'
import Link from 'next/link'
import { Card, Row, Col, Typography } from 'antd'
import Layout from '@/components/layout/Layout'

const { Title } = Typography

export default function BlogPage() {
  return (
    <Layout currentPage="blog" showHeader>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <Title level={1}>Blog</Title>
        <Row gutter={[24, 24]} justify="start">
          <Col xs={24} sm={12} md={8}>
            <Link href="/blog/biirbal-vs-getpocket" className="block">
              <Card
                hoverable
                cover={
                  <Image
                    src="/blog/thumbnails/biirbal-getpocket.svg"
                    alt="Comparison between Biirbal and GetPocket"
                    width={400}
                    height={225}
                  />
                }
              >
                <Card.Meta
                  title="Biirbal vs GetPocket: Which Tool Fits Your Workflow?"
                  description="A detailed comparison of Biirbal and GetPocket to help you choose the best content management solution."
                />
              </Card>
            </Link>
          </Col>
        </Row>
      </div>
    </Layout>
  )
}
