'use client'

import { signIn, getSession } from 'next-auth/react'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, Typography, Button, Space, Input, Form, Alert, Divider } from 'antd'
import { GoogleOutlined, MailOutlined, SlackOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

function SignInContent() {
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [email, setEmail] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const error = searchParams.get('error')

  useEffect(() => {
    // Check if user is already signed in
    getSession().then((session) => {
      if (session) {
        router.push(callbackUrl)
      }
    })
  }, [callbackUrl, router])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      await signIn('google', { callbackUrl })
    } catch (error) {
      console.error('Sign-in error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRedirectUri = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/slack/oauth`
    }
    return `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.biirbal.com'}/api/slack/oauth`
  }

  const slackInstallUrl = `https://slack.com/oauth/v2/authorize?client_id=${process.env.NEXT_PUBLIC_SLACK_CLIENT_ID}&scope=app_mentions:read,channels:history,channels:read,chat:write,files:write,groups:history,groups:read,im:history,im:read,mpim:history,mpim:read&user_scope=users:read&redirect_uri=${encodeURIComponent(getRedirectUri())}`

  const handleEmailSignIn = async (values: { email: string }) => {
    setLoading(true)
    try {
      const result = await signIn('email', { 
        email: values.email,
        callbackUrl,
        redirect: false
      })
      
      if (result?.ok) {
        setEmail(values.email)
        setEmailSent(true)
      }
    } catch (error) {
      console.error('Email sign-in error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (emailSent) {
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
            <div style={{ fontSize: '48px' }}>📧</div>
            <Title level={3}>Check your email</Title>
            <Text type="secondary">
              We've sent a sign-in link to <strong>{email}</strong>. 
              Click the link in the email to sign in to your account.
            </Text>
            <Button 
              type="link" 
              onClick={() => setEmailSent(false)}
            >
              Use a different email
            </Button>
          </Space>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card 
        style={{ 
          width: 440, 
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
          border: 'none',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <Title level={1} style={{ 
              margin: 0, 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: '32px',
              fontWeight: 700
            }}>
              🎧 Biirbal
            </Title>
            <Text 
              type="secondary" 
              style={{ 
                fontSize: '16px',
                color: '#8c8c8c',
                fontWeight: 500
              }}
            >
              Sign in to your account
            </Text>
          </div>

          {error && (
            <Alert
              message="Authentication Error"
              description={
                error === 'OAuthAccountNotLinked' 
                  ? 'This email is already associated with another sign-in method. Please use the same method you used to create your account.'
                  : 'There was an error signing you in. Please try again.'
              }
              type="error"
              showIcon
            />
          )}

          <Button
            type="primary"
            size="large"
            icon={<GoogleOutlined />}
            loading={loading}
            onClick={handleGoogleSignIn}
            block
            style={{
              background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
              borderColor: '#1890ff',
              fontWeight: 600,
              height: '48px',
              boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
              border: 'none',
            }}
          >
            Continue with Google
          </Button>

          <Button
            type="default"
            size="large"
            icon={<SlackOutlined />}
            href={slackInstallUrl}
            block
            style={{ 
              background: 'linear-gradient(135deg, #4A154B 0%, #6B4E71 100%)',
              borderColor: '#4A154B', 
              color: 'white',
              marginTop: '8px',
              fontWeight: 600,
              height: '48px',
              boxShadow: '0 4px 12px rgba(74, 21, 75, 0.3)',
              border: 'none'
            }}
          >
            Continue with Slack
          </Button>

          <Divider style={{ 
            borderColor: '#e8e8e8',
            fontSize: '14px',
            color: '#8c8c8c',
            fontWeight: 500
          }}>
            Or sign in with email
          </Divider>

          <Form onFinish={handleEmailSignIn} layout="vertical">
            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' }
              ]}
            >
              <Input
                size="large"
                placeholder="Enter your email"
                prefix={<MailOutlined />}
                style={{
                  borderRadius: '8px',
                  border: '2px solid #f0f0f0',
                  height: '48px',
                  fontSize: '16px'
                }}
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="default"
                size="large"
                htmlType="submit"
                loading={loading}
                block
                style={{
                  background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                  borderColor: '#52c41a',
                  color: 'white',
                  fontWeight: 600,
                  height: '48px',
                  boxShadow: '0 4px 12px rgba(82, 196, 26, 0.3)',
                  border: 'none'
                }}
              >
                Continue with Email
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              By signing in, you agree to our Terms of Service and Privacy Policy
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  )
}

export default function SignIn() {
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
            <Title level={2} style={{ margin: 0 }}>
              🎧 Biirbal
            </Title>
            <Text type="secondary">Loading...</Text>
          </Space>
        </Card>
      </div>
    }>
      <SignInContent />
    </Suspense>
  )
}