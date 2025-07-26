'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Typography, 
  Space, 
  Alert, 
  Divider,
  Row,
  Col 
} from 'antd'
import { 
  MailOutlined, 
  LockOutlined, 
  GoogleOutlined, 
  SlackOutlined 
} from '@ant-design/icons'
import Layout from '@/components/layout/Layout'
import Link from 'next/link'

const { Title, Text } = Typography

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  const handleEmailLogin = async (values: { email: string; password: string }) => {
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        router.push(callbackUrl)
      }
    } catch (err) {
      setError('An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSignIn = async (values: { email: string }) => {
    setLoading(true)
    setError('')

    try {
      const result = await signIn('email', {
        email: values.email,
        redirect: false,
        callbackUrl,
      })

      if (result?.error) {
        setError('Failed to send magic link')
      } else {
        router.push('/auth/verify-request?email=' + encodeURIComponent(values.email))
      }
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout currentPage="login" showHeader={false}>
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
            maxWidth: 400,
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <img src="/logo.png" alt="Biirbal" height="32" style={{ marginBottom: 16 }} />
            <Title level={2} style={{ margin: 0 }}>Welcome Back</Title>
            <Text type="secondary">Sign in to your account</Text>
          </div>

          {error && (
            <Alert 
              message={error} 
              type="error" 
              showIcon 
              style={{ marginBottom: 24 }}
            />
          )}

          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Email + Password Login */}
            <Form
              name="login"
              onFinish={handleEmailLogin}
              layout="vertical"
            >
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input 
                  prefix={<MailOutlined />} 
                  placeholder="Email address"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: 'Please enter your password' }]}
              >
                <Input.Password 
                  prefix={<LockOutlined />} 
                  placeholder="Password"
                  size="large"
                />
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  size="large"
                  style={{ width: '100%' }}
                >
                  Sign In
                </Button>
              </Form.Item>
            </Form>

            <Divider>or</Divider>

            {/* Magic Link Login */}
            <Form
              name="magic-link"
              onFinish={handleEmailSignIn}
              layout="vertical"
            >
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' }
                ]}
              >
                <Input 
                  prefix={<MailOutlined />} 
                  placeholder="Email for magic link"
                  size="large"
                />
              </Form.Item>

              <Form.Item>
                <Button 
                  htmlType="submit" 
                  loading={loading}
                  size="large"
                  style={{ width: '100%' }}
                  icon={<MailOutlined />}
                >
                  Send Magic Link
                </Button>
              </Form.Item>
            </Form>
          </Space>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Text type="secondary">
              Don't have an account?{' '}
              <Link href="/auth/register">
                <Button type="link" style={{ padding: 0 }}>
                  Sign up
                </Button>
              </Link>
            </Text>
          </div>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Text type="secondary">
              <Link href="/auth/reset-password">
                <Button type="link" style={{ padding: 0 }}>
                  Forgot your password?
                </Button>
              </Link>
            </Text>
          </div>
        </Card>
      </div>
    </Layout>
  )
}