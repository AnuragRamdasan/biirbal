'use client'

import { Card, Typography, Space, Button } from 'antd'
import { MailOutlined } from '@ant-design/icons'
import Link from 'next/link'

const { Title, Text } = Typography

export default function VerifyRequest() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card style={{ width: 400, textAlign: 'center' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <MailOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
          <Title level={3}>Check your email</Title>
          <Text type="secondary">
            A sign-in link has been sent to your email address. 
            Click the link in the email to sign in to your account.
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Didn't receive the email? Check your spam folder or try again.
          </Text>
          <Link href="/auth/signin">
            <Button type="link">
              Back to sign in
            </Button>
          </Link>
        </Space>
      </Card>
    </div>
  )
}