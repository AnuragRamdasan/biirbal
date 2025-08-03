'use client'

import { signIn, getSession } from 'next-auth/react'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, Typography, Button, Space, Input, Form, Alert, Divider } from 'antd'
import { GoogleOutlined, MailOutlined } from '@ant-design/icons'

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

  const handleSlackSignIn = async () => {
    setLoading(true)
    try {
      await signIn('slack', { callbackUrl })
    } catch (error) {
      console.error('Slack sign-in error:', error)
    } finally {
      setLoading(false)
    }
  }

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
      <Card style={{ width: 400 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ margin: 0 }}>
              🎧 Biirbal
            </Title>
            <Text type="secondary">Sign in to your account</Text>
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
          >
            Continue with Google
          </Button>

          <Button
            type="default"
            size="large"
            loading={loading}
            onClick={handleSlackSignIn}
            block
            style={{ 
              backgroundColor: '#4A154B', 
              borderColor: '#4A154B', 
              color: 'white',
              marginTop: '8px'
            }}
          >
            🔗 Continue with Slack
          </Button>

          <Divider>Or</Divider>

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
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="default"
                size="large"
                htmlType="submit"
                loading={loading}
                block
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