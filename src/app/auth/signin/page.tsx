'use client'

import { signIn, getSession } from 'next-auth/react'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, Typography, Button, Space, Input, Form, Alert, Divider, Row, Col } from 'antd'
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Background Pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />
        
        <Card style={{ 
          width: 480, 
          textAlign: 'center',
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
          border: 'none',
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          zIndex: 1
        }}>
          <Space direction="vertical" size="large" style={{ width: '100%', padding: '24px 0' }}>
            <div style={{ 
              fontSize: '64px',
              background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: '16px 0'
            }}>📧</div>
            <Title level={2} style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: '32px',
              fontWeight: 700,
              margin: '0 0 16px 0'
            }}>Check your email</Title>
            <Text style={{ 
              color: '#666',
              fontSize: '16px',
              lineHeight: '1.6',
              maxWidth: '360px',
              margin: '0 auto'
            }}>
              We've sent a sign-in link to <strong style={{ color: '#667eea' }}>{email}</strong>. 
              Click the link in the email to sign in to your account.
            </Text>
            <Button 
              type="default"
              size="large"
              onClick={() => setEmailSent(false)}
              style={{
                borderColor: '#667eea',
                color: '#667eea',
                fontWeight: 600,
                height: '48px',
                borderRadius: '12px',
                marginTop: '16px'
              }}
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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />
      
      <div style={{ 
        maxWidth: 1200, 
        margin: '0 auto', 
        padding: '60px 24px',
        position: 'relative',
        zIndex: 1,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center'
      }}>
        <Row justify="center" align="middle" gutter={[64, 48]} style={{ width: '100%' }}>
          {/* Left Column - Hero Content */}
          <Col xs={24} lg={12}>
            <div style={{ textAlign: 'left', color: 'white' }}>
              {/* Logo and Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '50px',
                padding: '8px 16px',
                marginBottom: '24px',
                fontSize: '14px',
                fontWeight: 500
              }}>
                <span style={{ marginRight: '8px' }}>🎧</span>
                Biirbal - AI Audio Summaries
              </div>

              {/* Main Headline */}
              <Title level={1} style={{ 
                color: 'white', 
                fontWeight: 700, 
                margin: '0 0 24px 0', 
                fontSize: '48px',
                lineHeight: '1.1',
                letterSpacing: '-0.02em'
              }}>
                Welcome back to
                <br />
                <span style={{
                  background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  zero reading backlog
                </span>
              </Title>
              
              {/* Subheadline */}
              <Title level={3} style={{ 
                color: 'rgba(255,255,255,0.9)', 
                fontWeight: 400, 
                margin: '0 0 32px 0',
                fontSize: '20px',
                lineHeight: '1.4'
              }}>
                Sign in to access your{' '}
                <span style={{
                  background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontWeight: 600
                }}>
                  AI-powered audio summaries
                </span>
              </Title>
              
              {/* Benefits List */}
              <div style={{ marginBottom: '32px' }}>
                {[
                  '🚀 Get insights in 59 seconds',
                  '📚 Zero reading backlog',
                  '🎯 Key takeaways, no fluff',
                  '⚡ Save hours every week'
                ].map((benefit, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: '12px',
                    fontSize: '16px',
                    color: 'rgba(255,255,255,0.9)'
                  }}>
                    <span style={{ marginRight: '12px' }}>{benefit.split(' ')[0]}</span>
                    <span>{benefit.split(' ').slice(1).join(' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </Col>

          {/* Right Column - Sign In Form */}
          <Col xs={24} lg={10}>
            <Card 
              style={{ 
                borderRadius: '24px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(20px)'
              }}
            >
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <Title level={2} style={{ 
                    margin: '0 0 8px 0', 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontSize: '28px',
                    fontWeight: 700
                  }}>
                    Sign In
                  </Title>
                  <Text 
                    style={{ 
                      fontSize: '16px',
                      color: '#666',
                      fontWeight: 500
                    }}
                  >
                    Choose your preferred sign-in method
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
              background: 'linear-gradient(135deg, #4285f4 0%, #1a73e8 100%)',
              borderColor: 'transparent',
              fontWeight: 600,
              height: '56px',
              fontSize: '16px',
              boxShadow: '0 8px 24px rgba(66, 133, 244, 0.3)',
              border: 'none',
              borderRadius: '12px',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(66, 133, 244, 0.4)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(66, 133, 244, 0.3)'
            }}
          >
            Continue with Google
          </Button>

          <Button
            type="default"
            size="large"
            icon={<SlackOutlined />}
            loading={loading}
            onClick={handleSlackSignIn}
            block
            style={{ 
              background: 'linear-gradient(135deg, #4A154B 0%, #350d40 100%)',
              borderColor: 'transparent', 
              color: 'white',
              marginTop: '12px',
              fontWeight: 600,
              height: '56px',
              fontSize: '16px',
              boxShadow: '0 8px 24px rgba(74, 21, 75, 0.3)',
              border: 'none',
              borderRadius: '12px',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(74, 21, 75, 0.4)'
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0px)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(74, 21, 75, 0.3)'
              }
            }}
          >
            Continue with Slack
          </Button>

          <Divider style={{ 
            borderColor: '#e8e8e8',
            fontSize: '14px',
            color: '#8c8c8c',
            fontWeight: 500,
            margin: '24px 0'
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
                placeholder="Enter your email address"
                prefix={<MailOutlined style={{ color: '#8c8c8c' }} />}
                style={{
                  borderRadius: '12px',
                  border: '2px solid #f0f0f0',
                  height: '56px',
                  fontSize: '16px',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea'
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#f0f0f0'
                  e.target.style.boxShadow = 'none'
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
                  borderColor: 'transparent',
                  color: 'white',
                  fontWeight: 600,
                  height: '56px',
                  fontSize: '16px',
                  boxShadow: '0 8px 24px rgba(82, 196, 26, 0.3)',
                  border: 'none',
                  borderRadius: '12px',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(52, 196, 26, 0.4)'
                  }
                }}
                onMouseOut={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(0px)'
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(52, 196, 26, 0.3)'
                  }
                }}
              >
                Continue with Email
              </Button>
            </Form.Item>
          </Form>

          {/* Social Proof */}
          <div style={{ 
            textAlign: 'center', 
            padding: '16px',
            background: 'rgba(102, 126, 234, 0.05)',
            borderRadius: '12px',
            marginTop: '8px'
          }}>
            <Text style={{ 
              fontSize: '13px',
              color: '#666',
              fontWeight: 500
            }}>
              ✨ Trusted by teams at Microsoft, Shopify, and 500+ companies
            </Text>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <Text type="secondary" style={{ 
              fontSize: '12px',
              lineHeight: '1.4'
            }}>
              By signing in, you agree to our{' '}
              <a href="/terms" style={{ color: '#667eea', textDecoration: 'none' }}>
                Terms of Service
              </a>
              {' '}and{' '}
              <a href="/privacy" style={{ color: '#667eea', textDecoration: 'none' }}>
                Privacy Policy
              </a>
            </Text>
          </div>
        </Space>
      </Card>
      
      {/* Additional CTA Section */}
      <div style={{
        textAlign: 'center',
        marginTop: '32px',
        color: 'rgba(255,255,255,0.8)'
      }}>
        <Text style={{ 
          fontSize: '14px',
          color: 'rgba(255,255,255,0.7)'
        }}>
          Don't have an account? Sign up above and get started in seconds
        </Text>
      </div>
    </Col>
  </Row>
      </div>
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