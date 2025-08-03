'use client'

import { Card, Typography, Space, Button, Alert } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const { Title, Text } = Typography

const errorMessages: Record<string, string> = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'Access denied. You do not have permission to sign in.',
  Verification: 'The verification token has expired or has already been used.',
  Default: 'An error occurred during authentication.',
}

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || 'Default'
  
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
          <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#ff4d4f' }} />
          <Title level={3}>Authentication Error</Title>
          
          <Alert
            message={errorMessages[error] || errorMessages.Default}
            type="error"
            showIcon={false}
          />
          
          <Text type="secondary">
            Please try signing in again or contact support if the problem persists.
          </Text>
          
          <Space>
            <Link href="/auth/signin">
              <Button type="primary">
                Try Again
              </Button>
            </Link>
            <Link href="/contact">
              <Button type="default">
                Contact Support
              </Button>
            </Link>
          </Space>
        </Space>
      </Card>
    </div>
  )
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Card style={{ width: 400, textAlign: 'center' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#ff4d4f' }} />
            <Title level={3}>Loading...</Title>
          </Space>
        </Card>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}