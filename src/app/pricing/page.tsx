'use client'

import { useState } from 'react'
import Script from 'next/script'
import { 
  Row, 
  Col, 
  Button, 
  Card, 
  Typography, 
  Space, 
  Badge, 
  List, 
  Divider,
  Switch,
  Statistic
} from 'antd'
import {
  CheckOutlined,
  CrownOutlined,
  RocketOutlined,
  StarOutlined,
  TeamOutlined,
  SoundOutlined,
  SlackOutlined,
  SafetyCertificateOutlined,
  QuestionCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons'
import Layout from '@/components/layout/Layout'

const { Title, Text, Paragraph } = Typography

interface PricingPlan {
  id: string
  name: string
  description: string
  price: number
  features: string[]
  isPopular?: boolean
  stripePriceId?: string
}

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [isAnnual, setIsAnnual] = useState(false)

  const handleSubscribe = async (planId: string) => {
    setLoading(planId)
    
    try {
      // Get team ID from localStorage
      const teamId = localStorage.getItem('biirbal_team_id')
      
      if (!teamId) {
        alert('Please install the biirbal.ai Slack app first to access subscription plans.')
        window.location.href = '/'
        return
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, teamId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Checkout failed')
      }

      const { url } = await response.json()
      
      if (url) {
        window.location.href = url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error) {
      console.error('Checkout failed:', error)
      alert(`Failed to start checkout: ${error instanceof Error ? error.message : 'Please try again.'}`)
    } finally {
      setLoading(null)
    }
  }

  const plans: PricingPlan[] = [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for small teams getting started',
      price: 0,
      features: [
        '30 audio summaries per month',
        'Up to 2 team members',
        'Basic Slack integration',
        'Standard processing speed',
        'Community support'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'For growing teams',
      price: isAnnual ? 199.9 : 19.99,
      isPopular: true,
      stripePriceId: 'price_pro',
      features: [
        '100 audio summaries per month',
        'Up to 5 team members',
        'Advanced Slack integration',
        'Priority processing',
        'Team analytics dashboard',
        'Email support'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For large organizations',
      price: isAnnual ? 699.9 : 69.99,
      stripePriceId: 'price_enterprise',
      features: [
        'Unlimited audio summaries',
        'Unlimited team members',
        'Advanced analytics & reporting',
        'Custom integrations',
        'Dedicated account manager',
        'Priority support (SLA)',
        'Custom voice training',
        'SSO & security features'
      ]
    }
  ]

  const faqItems = [
    {
      question: 'How does the free trial work?',
      answer: 'You get 50 audio summaries completely free for 7 days. No credit card required to start.'
    },
    {
      question: 'Can I change plans later?',
      answer: 'Yes, you can upgrade or downgrade your plan at any time from your dashboard.'
    },
    {
      question: 'What happens to my summaries if I cancel?',
      answer: 'Your summaries remain accessible for 30 days after cancellation to allow for data export.'
    },
    {
      question: 'Do you offer refunds?',
      answer: 'Yes, we offer a 30-day money-back guarantee for all paid plans.'
    }
  ]

  return (
    <Layout currentPage="pricing">
      <div style={{ padding: '24px 0' }}>
        {/* Hero Section */}
        <div style={{ textAlign: 'center', padding: '60px 0', background: '#f8f9fa' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Badge count="Simple Pricing" style={{ backgroundColor: '#52c41a' }}>
                <Title level={1} style={{ margin: 0 }}>
                  <Space>
                    <CrownOutlined />
                    Choose Your Plan
                  </Space>
                </Title>
              </Badge>
              
              <Paragraph style={{ fontSize: 18, color: '#666', maxWidth: 600, margin: '0 auto' }}>
                Start with our free trial and scale as your team grows. 
                All plans include core AI summarization features.
              </Paragraph>

              <div style={{ marginTop: 32 }}>
                <Space align="center">
                  <Text>Monthly</Text>
                  <Switch 
                    checked={isAnnual}
                    onChange={setIsAnnual}
                    checkedChildren="Annual"
                    unCheckedChildren="Monthly"
                  />
                  <Text>Annual</Text>
                  {isAnnual && (
                    <Badge count="Save 20%" style={{ backgroundColor: '#52c41a', marginLeft: 8 }} />
                  )}
                </Space>
              </div>
            </Space>
          </div>
        </div>

        {/* Pricing Cards */}
        <div style={{ padding: '60px 0' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
            <Row gutter={[24, 24]} justify="center">
              {plans.map((plan) => (
                <Col xs={24} md={8} key={plan.id}>
                  <Card
                    style={{ 
                      height: '100%',
                      position: 'relative',
                      ...(plan.isPopular && {
                        border: '2px solid #1890ff',
                        transform: 'scale(1.05)',
                        zIndex: 1
                      })
                    }}
                    hoverable
                  >
                    {plan.isPopular && (
                      <div style={{
                        position: 'absolute',
                        top: -10,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 2
                      }}>
                        <Badge count="Most Popular" style={{ backgroundColor: '#1890ff' }} />
                      </div>
                    )}

                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                      <Space direction="vertical" size="small">
                        <Title level={3} style={{ margin: 0 }}>
                          {plan.name}
                          {plan.name === 'Enterprise' && <CrownOutlined style={{ marginLeft: 8, color: '#faad14' }} />}
                        </Title>
                        
                        <Text type="secondary">{plan.description}</Text>
                        
                        <div style={{ margin: '16px 0' }}>
                          <Statistic
                            value={plan.price}
                            prefix="$"
                            suffix={plan.price > 0 ? (isAnnual ? '/year' : '/month') : ''}
                            valueStyle={{ 
                              fontSize: 36, 
                              fontWeight: 'bold',
                              color: plan.isPopular ? '#1890ff' : '#262626'
                            }}
                          />
                          {isAnnual && plan.price > 0 && (
                            <Text type="secondary">
                              {Math.round((plan.price / 12) * 100) / 100}/month billed annually
                            </Text>
                          )}
                        </div>
                      </Space>
                    </div>

                    <List
                      dataSource={plan.features}
                      renderItem={(feature) => (
                        <List.Item style={{ border: 'none', padding: '4px 0' }}>
                          <Space>
                            <CheckOutlined style={{ color: '#52c41a' }} />
                            <Text>{feature}</Text>
                          </Space>
                        </List.Item>
                      )}
                      style={{ marginBottom: 24 }}
                    />

                    <div style={{ textAlign: 'center' }}>
                      {plan.id === 'free' ? (
                        <Button 
                          type="default" 
                          size="large" 
                          icon={<RocketOutlined />}
                          href="/"
                          style={{ width: '100%', height: 48 }}
                        >
                          Start Free
                        </Button>
                      ) : (
                        <Button 
                          type={plan.isPopular ? 'primary' : 'default'}
                          size="large" 
                          icon={loading === plan.id ? <LoadingOutlined /> : <CrownOutlined />}
                          loading={loading === plan.id}
                          onClick={() => handleSubscribe(plan.id)}
                          style={{ 
                            width: '100%', 
                            height: 48,
                            ...(plan.isPopular && { 
                              background: '#1890ff',
                              borderColor: '#1890ff'
                            })
                          }}
                        >
                          {plan.id === 'enterprise' ? 'Contact Sales' : 'Get Started'}
                        </Button>
                      )}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>

        {/* Features Comparison */}
        <div style={{ padding: '60px 0', background: '#f8f9fa' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <Title level={2}>
                <Space>
                  <StarOutlined />
                  What's Included
                </Space>
              </Title>
            </div>

            <Row gutter={[32, 32]}>
              <Col xs={24} md={8}>
                <Card bordered={false} style={{ textAlign: 'center', height: '100%' }}>
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <SoundOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                    <Title level={4}>AI-Powered Summaries</Title>
                    <Text type="secondary">
                      Advanced AI creates accurate 59-second audio summaries from any web content
                    </Text>
                  </Space>
                </Card>
              </Col>
              
              <Col xs={24} md={8}>
                <Card bordered={false} style={{ textAlign: 'center', height: '100%' }}>
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <SlackOutlined style={{ fontSize: 48, color: '#52c41a' }} />
                    <Title level={4}>Slack Integration</Title>
                    <Text type="secondary">
                      Seamlessly integrates with your existing Slack workspace and workflows
                    </Text>
                  </Space>
                </Card>
              </Col>
              
              <Col xs={24} md={8}>
                <Card bordered={false} style={{ textAlign: 'center', height: '100%' }}>
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <TeamOutlined style={{ fontSize: 48, color: '#722ed1' }} />
                    <Title level={4}>Team Analytics</Title>
                    <Text type="secondary">
                      Track team engagement and understand content consumption patterns
                    </Text>
                  </Space>
                </Card>
              </Col>
            </Row>
          </div>
        </div>

        {/* FAQ Section */}
        <div style={{ padding: '60px 0' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <Title level={2}>
                <Space>
                  <QuestionCircleOutlined />
                  Frequently Asked Questions
                </Space>
              </Title>
            </div>

            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {faqItems.map((faq, index) => (
                <Card key={index} style={{ width: '100%' }}>
                  <Title level={4} style={{ marginBottom: 8 }}>
                    {faq.question}
                  </Title>
                  <Text type="secondary">{faq.answer}</Text>
                </Card>
              ))}
            </Space>
          </div>
        </div>

        {/* Enterprise CTA */}
        <div style={{ padding: '60px 0', background: '#001529', color: 'white' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Title level={2} style={{ color: 'white' }}>
                <Space>
                  <SafetyCertificateOutlined />
                  Enterprise Ready
                </Space>
              </Title>
              
              <Paragraph style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18 }}>
                Need custom features, on-premise deployment, or enterprise-grade security? 
                Let's discuss a custom solution for your organization.
              </Paragraph>

              <Space size="large">
                <Button 
                  type="primary" 
                  size="large"
                  icon={<TeamOutlined />}
                  style={{ height: 48, fontSize: 16 }}
                >
                  Contact Sales
                </Button>
                
                <Button 
                  size="large" 
                  ghost
                  href="/"
                  style={{ 
                    borderColor: 'white',
                    color: 'white',
                    height: 48,
                    fontSize: 16
                  }}
                >
                  Start Free Trial
                </Button>
              </Space>

              <div style={{ marginTop: 40 }}>
                <Space split={<Divider type="vertical" />}>
                  <Text style={{ color: 'rgba(255,255,255,0.8)' }}>SOC 2 Compliant</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.8)' }}>GDPR Ready</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.8)' }}>99.9% SLA</Text>
                </Space>
              </div>
            </Space>
          </div>
        </div>
      </div>

      {/* Pricing-specific structured data */}
      <Script
        id="pricing-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "biirbal.ai Pricing Plans",
            "description": "Pricing plans for biirbal.ai AI-powered Slack content intelligence",
            "itemListElement": plans.map((plan, index) => ({
              "@type": "Product",
              "position": index + 1,
              "name": `biirbal.ai ${plan.name}`,
              "description": plan.description,
              "offers": {
                "@type": "Offer",
                "price": plan.price,
                "priceCurrency": "USD"
              }
            }))
          }),
        }}
      />
    </Layout>
  )
}