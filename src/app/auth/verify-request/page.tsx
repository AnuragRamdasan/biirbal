'use client'

import { useSearchParams } from 'next/navigation'
import { Card, Typography, Space, Button } from 'antd'
import { MailOutlined, CheckCircleOutlined } from '@ant-design/icons'
import Layout from '@/components/layout/Layout'
import Link from 'next/link'

const { Title, Text, Paragraph } = Typography

export default function VerifyRequestPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  return (
    <Layout currentPage="verify" showHeader={false}>
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <Card 
          style={{ 
            width: '100%', 
            maxWidth: 500,
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <CheckCircleOutlined 
                style={{ 
                  fontSize: 64, 
                  color: '#52c41a', 
                  marginBottom: 16 
                }} 
              />
            </div>

            <div>
              <Title level={2}>Check your email</Title>
              <Paragraph style={{ fontSize: 16, color: '#666' }}>
                We've sent a magic link to{' '}
                {email && (
                  <Text strong style={{ color: '#1890ff' }}>
                    {email}
                  </Text>
                )}
              </Paragraph>
              <Paragraph style={{ color: '#666' }}>
                Click the link in the email to sign in to your account. 
                The link will expire in 1 hour for security reasons.
              </Paragraph>
            </div>

            <div style={{ background: '#f6f8fa', padding: 16, borderRadius: 8 }}>
              <Space direction="vertical" align="center">
                <MailOutlined style={{ fontSize: 24, color: '#666' }} />
                <Text type="secondary" style={{ fontSize: 14 }}>
                  Didn't receive the email? Check your spam folder or try again.
                </Text>
              </Space>
            </div>

            <Space>
              <Link href="/auth/login">
                <Button>
                  Back to Login
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button type="primary">
                  Try Different Email
                </Button>
              </Link>
            </Space>
          </Space>
        </Card>
      </div>
    </Layout>
  )
}