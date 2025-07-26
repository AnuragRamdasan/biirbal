'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Typography, 
  Space, 
  Alert, 
  Divider 
} from 'antd'
import { 
  MailOutlined, 
  LockOutlined, 
  UserOutlined 
} from '@ant-design/icons'
import Layout from '@/components/layout/Layout'
import Link from 'next/link'

const { Title, Text } = Typography

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleRegister = async (values: { email: string }) => {
    // For now, registration is handled via magic link email
    await handleEmailSignIn(values)
  }

  const handleEmailSignIn = async (values: { email: string }) => {
    setLoading(true)
    setError('')

    try {
      const result = await signIn('email', {
        email: values.email,
        redirect: false,
        callbackUrl: '/dashboard',
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
    <Layout currentPage="register" showHeader={false}>
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
            <Title level={2} style={{ margin: 0 }}>Create Account</Title>
            <Text type="secondary">Get started with biirbal.ai</Text>
          </div>

          {error && (
            <Alert 
              message={error} 
              type="error" 
              showIcon 
              style={{ marginBottom: 24 }}
            />
          )}

          {success && (
            <Alert 
              message="Account created successfully! Signing you in..." 
              type="success" 
              showIcon 
              style={{ marginBottom: 24 }}
            />
          )}

          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Magic Link Registration */}
            <Form
              name="register"
              onFinish={handleRegister}
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
                  placeholder="Enter your email address"
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
                  icon={<MailOutlined />}
                >
                  Sign Up with Email
                </Button>
              </Form.Item>
            </Form>

            <div style={{ 
              background: '#f6f8fa', 
              padding: 16, 
              borderRadius: 8,
              textAlign: 'center'
            }}>
              <Text type="secondary" style={{ fontSize: 14 }}>
                We'll send you a secure link to create your account. No password required!
              </Text>
            </div>
          </Space>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Text type="secondary">
              Already have an account?{' '}
              <Link href="/auth/login">
                <Button type="link" style={{ padding: 0 }}>
                  Sign in
                </Button>
              </Link>
            </Text>
          </div>
        </Card>
      </div>
    </Layout>
  )
}