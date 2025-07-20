'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import Script from 'next/script'
import { 
  Row, 
  Col, 
  Button, 
  Card, 
  Typography, 
  Space, 
  Alert, 
  Statistic, 
  Badge,
  Divider,
  List,
  Avatar,
  Timeline,
  Tooltip
} from 'antd'
import {
  SoundOutlined,
  SlackOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  RocketOutlined,
  BulbOutlined,
  SafetyCertificateOutlined,
  GlobalOutlined,
  ArrowRightOutlined
} from '@ant-design/icons'
import Layout from '@/components/layout/Layout'
import { getOAuthRedirectUri, getBaseUrl } from '@/lib/config'

const { Title, Text, Paragraph } = Typography

function HomeContent() {
  const searchParams = useSearchParams()
  const [installed, setInstalled] = useState(false)
  const [error, setError] = useState('')
  const [showDashboard, setShowDashboard] = useState(false)

  useEffect(() => {
    if (searchParams.get('installed') === 'true') {
      setInstalled(true)
      setShowDashboard(true)
      
      // Store team ID and user ID from OAuth response
      const teamId = searchParams.get('teamId')
      const userId = searchParams.get('userId')
      if (teamId) {
        localStorage.setItem('biirbal_team_id', teamId)
      }
      if (userId) {
        localStorage.setItem('biirbal_user_id', userId)
      }
    }
    if (searchParams.get('error')) {
      setError(searchParams.get('error') || 'Installation failed')
    }
    
    // Check if user has been here before (simple check)
    const hasVisitedDashboard = localStorage.getItem('biirbal_visited_dashboard')
    const hasTeamId = localStorage.getItem('biirbal_team_id')
    if (hasVisitedDashboard && hasTeamId && !searchParams.get('error')) {
      setShowDashboard(true)
    }
  }, [searchParams])

  // If user should see dashboard, redirect them
  useEffect(() => {
    if (showDashboard && !error) {
      localStorage.setItem('biirbal_visited_dashboard', 'true')
      window.location.href = '/dashboard'
    }
  }, [showDashboard, error])

  // Force custom domain for OAuth redirect
  const getRedirectUri = () => {
    return getOAuthRedirectUri()
  }

  const slackInstallUrl = `https://slack.com/oauth/v2/authorize?client_id=${process.env.NEXT_PUBLIC_SLACK_CLIENT_ID}&scope=app_mentions:read,channels:history,channels:read,chat:write,files:write,groups:history,groups:read,im:history,im:read,mpim:history,mpim:read&user_scope=users:read&redirect_uri=${encodeURIComponent(getRedirectUri())}`

  const features = [
    {
      icon: <SoundOutlined style={{ fontSize: 24, color: '#1890ff' }} />,
      title: 'AI Audio Summaries',
      description: 'Get 59-second AI-generated audio summaries of any link shared in Slack'
    },
    {
      icon: <SlackOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
      title: 'Seamless Slack Integration',
      description: 'Works automatically with any link shared in your Slack channels'
    },
    {
      icon: <ClockCircleOutlined style={{ fontSize: 24, color: '#722ed1' }} />,
      title: 'Save Time',
      description: 'Quickly understand content without reading entire articles'
    },
    {
      icon: <TeamOutlined style={{ fontSize: 24, color: '#fa8c16' }} />,
      title: 'Team Collaboration',
      description: 'Share insights across your team with audio summaries'
    }
  ]

  const howItWorks = [
    {
      icon: <SlackOutlined />,
      title: 'Share Link in Slack',
      description: 'Someone shares a link in any Slack channel'
    },
    {
      icon: <RocketOutlined />,
      title: 'AI Processing',
      description: 'biirbal.ai automatically processes the content'
    },
    {
      icon: <SoundOutlined />,
      title: 'Audio Summary',
      description: 'Get a 59-second audio summary delivered back to Slack'
    },
    {
      icon: <PlayCircleOutlined />,
      title: 'Listen & Learn',
      description: 'Team members can listen to summaries instantly'
    }
  ]

  const stats = [
    { title: '59 Seconds', value: 'Average Summary Length', icon: <ClockCircleOutlined /> },
    { title: '90%', value: 'Time Saved', icon: <CheckCircleOutlined /> },
    { title: '24/7', value: 'Always Available', icon: <GlobalOutlined /> }
  ]

  return (
    <Layout currentPage="home" showHeader={true}>
      {/* Hero Section */}
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '80px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <Row justify="center" align="middle" gutter={[48, 48]}>
            <Col xs={24} lg={12}>
              <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
                <Badge count="AI Powered" style={{ backgroundColor: '#52c41a' }}>
                  <Space align="center" style={{ color: 'white' }}>
                    <img src="/logo.svg" alt="Biirbal" height="60" style={{ filter: 'brightness(0) invert(1)' }} />
                    <Title level={1} style={{ color: 'white', fontSize: '3rem', marginBottom: 0, marginLeft: 16 }}>
                      Biirbal
                    </Title>
                  </Space>
                </Badge>
                
                <Title level={2} style={{ color: 'white', fontWeight: 300, marginTop: 0 }}>
                  AI Audio Summaries for Slack Teams
                </Title>
                
                <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18, lineHeight: 1.6 }}>
                  Transform shared links into 59-second audio summaries. 
                  Save time, boost productivity, and keep your team informed.
                </Paragraph>

                {error && (
                  <Alert
                    message="Installation Error"
                    description={error}
                    type="error"
                    showIcon
                    style={{ marginBottom: 24 }}
                  />
                )}

                {installed && (
                  <Alert
                    message="Installation Successful!"
                    description="Redirecting to your dashboard..."
                    type="success"
                    showIcon
                    style={{ marginBottom: 24 }}
                  />
                )}

                <Space size="middle">
                  <Button 
                    type="primary" 
                    size="large" 
                    icon={<SlackOutlined />}
                    href={slackInstallUrl}
                    style={{ 
                      background: '#4A154B', 
                      borderColor: '#4A154B',
                      height: 48,
                      fontSize: 16,
                      fontWeight: 600
                    }}
                  >
                    Add to Slack
                  </Button>
                  
                  <Button 
                    size="large" 
                    ghost
                    href="/pricing"
                    style={{ 
                      borderColor: 'white',
                      color: 'white',
                      height: 48,
                      fontSize: 16
                    }}
                  >
                    View Pricing
                  </Button>
                </Space>
              </Space>
            </Col>
            
            <Col xs={24} lg={12}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  borderRadius: 16,
                  padding: 32,
                  backdropFilter: 'blur(10px)'
                }}>
                  <SoundOutlined style={{ fontSize: 80, color: 'white', marginBottom: 16 }} />
                  <Title level={3} style={{ color: 'white' }}>
                    59-Second Summaries
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Perfect length for quick consumption
                  </Text>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </div>

      {/* Stats Section */}
      <div style={{ padding: '60px 0', background: '#f8f9fa' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <Row gutter={[32, 32]} justify="center">
            {stats.map((stat, index) => (
              <Col xs={24} sm={8} key={index}>
                <Card 
                  style={{ textAlign: 'center', height: '100%' }}
                  bordered={false}
                  hoverable
                >
                  <Space direction="vertical" size="middle">
                    <div style={{ fontSize: 32, color: '#1890ff' }}>
                      {stat.icon}
                    </div>
                    <Statistic
                      title={stat.value}
                      value={stat.title}
                      valueStyle={{ fontSize: 28, fontWeight: 'bold', color: '#1890ff' }}
                    />
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* Features Section */}
      <div style={{ padding: '80px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <Title level={2}>
              <Space>
                <BulbOutlined />
                Why Choose biirbal.ai?
              </Space>
            </Title>
            <Paragraph style={{ fontSize: 18, color: '#666' }}>
              Supercharge your team's productivity with AI-powered audio summaries
            </Paragraph>
          </div>

          <Row gutter={[32, 32]}>
            {features.map((feature, index) => (
              <Col xs={24} sm={12} lg={6} key={index}>
                <Card 
                  style={{ height: '100%', textAlign: 'center' }}
                  bordered={false}
                  hoverable
                >
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {feature.icon}
                    <Title level={4}>{feature.title}</Title>
                    <Text type="secondary">{feature.description}</Text>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* How It Works Section */}
      <div style={{ padding: '80px 0', background: '#f8f9fa' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <Title level={2}>
              <Space>
                <RocketOutlined />
                How It Works
              </Space>
            </Title>
            <Paragraph style={{ fontSize: 18, color: '#666' }}>
              Get started in minutes with our simple 4-step process
            </Paragraph>
          </div>

          <Row justify="center">
            <Col xs={24} lg={16}>
              <Timeline
                mode="alternate"
                items={howItWorks.map((step, index) => ({
                  dot: (
                    <div style={{ 
                      background: '#1890ff', 
                      borderRadius: '50%',
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 18
                    }}>
                      {step.icon}
                    </div>
                  ),
                  children: (
                    <Card 
                      style={{ marginTop: -20 }}
                      bordered={false}
                    >
                      <Title level={4}>{step.title}</Title>
                      <Text type="secondary">{step.description}</Text>
                    </Card>
                  )
                }))}
              />
            </Col>
          </Row>
        </div>
      </div>

      {/* Pricing Section */}
      <div style={{ padding: '80px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <Title level={2}>
              <Space>
                <CheckCircleOutlined />
                Simple, Transparent Pricing
              </Space>
            </Title>
            <Paragraph style={{ fontSize: 18, color: '#666' }}>
              Start free and scale as your team grows
            </Paragraph>
          </div>

          <Row gutter={[32, 32]} justify="center">
            <Col xs={24} sm={8}>
              <Card style={{ textAlign: 'center', height: '100%' }} hoverable>
                <Title level={3}>Free</Title>
                <Title level={1} style={{ color: '#52c41a', margin: '16px 0' }}>$0</Title>
                <Text type="secondary">Perfect for small teams</Text>
                <List
                  style={{ margin: '24px 0' }}
                  dataSource={['10 audio summaries/month', 'Up to 2 team members', '2-5 min processing time']}
                  renderItem={(item) => (
                    <List.Item style={{ border: 'none', padding: '4px 0' }}>
                      <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        <Text>{item}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
                <Button type="default" size="large" href="/" style={{ width: '100%' }}>
                  Start Free
                </Button>
              </Card>
            </Col>

            <Col xs={24} sm={8}>
              <Card 
                style={{ 
                  textAlign: 'center', 
                  height: '100%', 
                  border: '2px solid #1890ff',
                  position: 'relative'
                }} 
                hoverable
              >
                <Badge 
                  count="Most Popular" 
                  style={{ 
                    position: 'absolute', 
                    top: -10, 
                    right: -10, 
                    backgroundColor: '#1890ff' 
                  }} 
                />
                <Title level={3}>Pro</Title>
                <Title level={1} style={{ color: '#1890ff', margin: '16px 0' }}>$19.99</Title>
                <Text type="secondary">For growing teams</Text>
                <List
                  style={{ margin: '24px 0' }}
                  dataSource={['100 audio summaries/month', 'Up to 5 team members', '30s processing time', 'Usage insights & reports']}
                  renderItem={(item) => (
                    <List.Item style={{ border: 'none', padding: '4px 0' }}>
                      <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        <Text>{item}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
                <Button type="primary" size="large" href="/pricing" style={{ width: '100%' }}>
                  Get Started
                </Button>
              </Card>
            </Col>

            <Col xs={24} sm={8}>
              <Card style={{ textAlign: 'center', height: '100%' }} hoverable>
                <Title level={3}>Enterprise</Title>
                <Title level={1} style={{ color: '#722ed1', margin: '16px 0' }}>$69.99</Title>
                <Text type="secondary">For large organizations</Text>
                <List
                  style={{ margin: '24px 0' }}
                  dataSource={['Unlimited summaries', 'Unlimited team members', '15s processing time', 'Advanced analytics + SLA']}
                  renderItem={(item) => (
                    <List.Item style={{ border: 'none', padding: '4px 0' }}>
                      <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        <Text>{item}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
                <Button type="default" size="large" href="/pricing" style={{ width: '100%' }}>
                  Get Started
                </Button>
              </Card>
            </Col>
          </Row>

          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <Paragraph style={{ color: '#666' }}>
              💰 <strong>20% discount available</strong> for non-profits, startups, and open source projects.{' '}
              <a href="mailto:hello@biirbal.ai?subject=Special Discount Inquiry">Contact us</a> to learn more.
            </Paragraph>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div style={{ padding: '80px 0', background: '#001529', color: 'white' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Title level={2} style={{ color: 'white' }}>
              Ready to Transform Your Team's Productivity?
            </Title>
            
            <Paragraph style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18 }}>
              Join thousands of teams already using biirbal.ai to stay informed and save time.
            </Paragraph>

            <Space size="large">
              <Button 
                type="primary" 
                size="large" 
                icon={<SlackOutlined />}
                href={slackInstallUrl}
                style={{ 
                  background: '#4A154B', 
                  borderColor: '#4A154B',
                  height: 48,
                  fontSize: 16,
                  fontWeight: 600
                }}
              >
                Add to Slack - Free Trial
              </Button>
              
              <Button 
                size="large" 
                ghost
                href="/pricing"
                icon={<ArrowRightOutlined />}
                style={{ 
                  borderColor: 'white',
                  color: 'white',
                  height: 48,
                  fontSize: 16
                }}
              >
                View Pricing Plans
              </Button>
            </Space>

            <div style={{ marginTop: 40 }}>
              <Space split={<Divider type="vertical" />}>
                <Space>
                  <SafetyCertificateOutlined />
                  <Text style={{ color: 'rgba(255,255,255,0.8)' }}>Secure & Reliable</Text>
                </Space>
                <Space>
                  <GlobalOutlined />
                  <Text style={{ color: 'rgba(255,255,255,0.8)' }}>Fast Processing</Text>
                </Space>
                <Space>
                  <TeamOutlined />
                  <Text style={{ color: 'rgba(255,255,255,0.8)' }}>Team Support</Text>
                </Space>
              </Space>
            </div>
          </Space>
        </div>
      </div>

      {/* Trust Indicators */}
      <div style={{ padding: '40px 0', background: '#fafafa' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 16 }}>
              Trusted by <strong>500+ teams</strong> who've saved <strong>1000+ hours</strong> staying informed
            </Text>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '40px', flexWrap: 'wrap' }}>
              <Text type="secondary" style={{ fontSize: 14 }}>🚀 YC Startups</Text>
              <Text type="secondary" style={{ fontSize: 14 }}>🏢 Fortune 500</Text>
              <Text type="secondary" style={{ fontSize: 14 }}>🎓 Universities</Text>
              <Text type="secondary" style={{ fontSize: 14 }}>💰 VC Firms</Text>
            </div>
          </Space>
        </div>
      </div>
    </Layout>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
      
      {/* Schema.org structured data */}
      <Script
        id="structured-data-software"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "biirbal.ai",
            "description": "AI-powered audio summaries for Slack teams. Transform shared links into 59-second audio summaries.",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            }
          }),
        }}
      />
    </Suspense>
  )
}