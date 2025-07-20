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
  Statistic,
  Slider
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
  const [linksPerWeek, setLinksPerWeek] = useState(8)
  const [teamSize, setTeamSize] = useState(3)

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

      // Debug: Log the team ID being used
      console.log('Using team ID:', teamId)

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, teamId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Checkout API error:', errorData)
        
        let errorMessage = errorData.error || 'Checkout failed'
        if (errorData.details) {
          errorMessage += `\n\nDetails: ${errorData.details}`
        }
        if (errorData.suggestion) {
          errorMessage += `\n\n${errorData.suggestion}`
        }
        
        throw new Error(errorMessage)
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
        '10 audio summaries per month',
        'Up to 2 team members',
        '2-5 min processing time'
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
        '30s processing time',
        'Usage insights & reports',
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
        '15s processing time',
        'Advanced analytics & reporting',
        'Priority support + SLA',
        'Custom integrations'
      ]
    }
  ]

  const faqItems = [
    {
      question: 'How does the free trial work?',
      answer: 'You get 10 audio summaries completely free. No credit card required to start. Upgrade anytime to unlock faster processing and more features.'
    },
    {
      question: 'What if I\'m not satisfied?',
      answer: 'We offer a 30-day money-back guarantee. If you\'re not saving time and staying more informed, get your money back - no questions asked.'
    },
    {
      question: 'How fast is the processing?',
      answer: 'Free: 2-5 minutes, Pro: 30 seconds, Enterprise: 15 seconds. Most teams see immediate productivity gains with faster processing.'
    },
    {
      question: 'Can I change plans later?',
      answer: 'Yes, you can upgrade or downgrade your plan at any time from your dashboard. Changes take effect immediately.'
    },
    {
      question: 'What happens to my summaries if I cancel?',
      answer: 'Your summaries remain accessible for 30 days after cancellation to allow for data export.'
    }
  ]

  return (
    <Layout currentPage="pricing">
      <div style={{ padding: '24px 0' }}>
        {/* Special Discount Banner */}
        <div style={{ background: '#001529', color: 'white', padding: '16px 0' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14 }}>
              💰 <strong>20% discount available</strong> for non-profits, startups, and open source groups.{' '}
              <a href="mailto:hello@biirbal.ai?subject=Special Discount Inquiry" style={{ color: '#52c41a' }}>
                Contact us
              </a> to learn more.
            </Text>
          </div>
        </div>

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

        {/* Social Proof & Urgency */}
        <div style={{ padding: '40px 0', background: '#f0f8ff', borderLeft: '4px solid #1890ff' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
            <Space direction="vertical" size="small">
              <Text style={{ fontSize: 16, color: '#1890ff', fontWeight: 600 }}>
                🔥 Join 500+ teams who've already saved 1000+ hours
              </Text>
              <Text type="secondary" style={{ fontSize: 14 }}>
                Don't let important content slip through the cracks while your competitors stay ahead
              </Text>
            </Space>
          </div>
        </div>

        {/* Usage Calculator */}
        <div style={{ padding: '60px 0', background: '#fff' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <Title level={3}>Find Your Perfect Plan</Title>
              <Text type="secondary">Answer a few questions to see which plan fits your team</Text>
            </div>
            
            <Card style={{ background: '#f8f9fa' }}>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <Text strong>How many links does your team share per week?</Text>
                  <div style={{ margin: '16px 0' }}>
                    <Slider
                      min={1}
                      max={50}
                      value={linksPerWeek}
                      onChange={setLinksPerWeek}
                      marks={{
                        1: '1',
                        10: '10',
                        25: '25',
                        50: '50+'
                      }}
                    />
                  </div>
                  <Text type="secondary">Currently: {linksPerWeek} links/week (~{linksPerWeek * 4} links/month)</Text>
                </div>
                
                <div>
                  <Text strong>How many team members need access?</Text>
                  <div style={{ margin: '16px 0' }}>
                    <Slider
                      min={1}
                      max={20}
                      value={teamSize}
                      onChange={setTeamSize}
                      marks={{
                        1: '1',
                        5: '5',
                        10: '10',
                        20: '20+'
                      }}
                    />
                  </div>
                  <Text type="secondary">Currently: {teamSize} team members</Text>
                </div>
                
                <div style={{ textAlign: 'center', marginTop: 24, padding: '20px', background: 'white', borderRadius: '8px' }}>
                  <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                    Recommended Plan: {
                      linksPerWeek * 4 <= 10 && teamSize <= 2 ? 'Free' :
                      linksPerWeek * 4 <= 100 && teamSize <= 5 ? 'Pro' : 
                      'Enterprise'
                    }
                  </Text>
                  <br />
                  <Text type="secondary">
                    {linksPerWeek * 4 <= 10 && teamSize <= 2 
                      ? 'Perfect for getting started!'
                      : linksPerWeek * 4 <= 100 && teamSize <= 5
                      ? 'Great for growing teams with 30s processing'
                      : 'Best for large teams needing unlimited capacity'
                    }
                  </Text>
                </div>
              </Space>
            </Card>
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
                          Start Free Trial
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
                          Get Started
                        </Button>
                      )}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>

        {/* Risk Reversal */}
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
            <Space direction="vertical" size="middle">
              <Space size="large" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
                <Badge count="30-Day Money Back" style={{ backgroundColor: '#52c41a' }}>
                  <SafetyCertificateOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                </Badge>
                <Badge count="No Setup Fees" style={{ backgroundColor: '#1890ff' }}>
                  <CheckCircleOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                </Badge>
                <Badge count="Cancel Anytime" style={{ backgroundColor: '#722ed1' }}>
                  <StarOutlined style={{ fontSize: 24, color: '#722ed1' }} />
                </Badge>
              </Space>
              <Text type="secondary">
                Risk-free trial. If you're not saving time within 30 days, get your money back.
              </Text>
            </Space>
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

        {/* Testimonials */}
        <div style={{ padding: '60px 0' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <Title level={2}>What Our Users Say</Title>
              <Text type="secondary">Join teams who've transformed their productivity</Text>
            </div>
            
            <Row gutter={[32, 32]}>
              <Col xs={24} md={8}>
                <Card style={{ height: '100%' }}>
                  <Space direction="vertical" size="middle">
                    <Text style={{ fontSize: 16, fontStyle: 'italic' }}>
                      "Saved our team 2 hours daily. We never miss important content anymore."
                    </Text>
                    <div>
                      <Text strong>Sarah Kim</Text>
                      <br />
                      <Text type="secondary">Product Manager, TechCorp</Text>
                    </div>
                  </Space>
                </Card>
              </Col>
              
              <Col xs={24} md={8}>
                <Card style={{ height: '100%' }}>
                  <Space direction="vertical" size="middle">
                    <Text style={{ fontSize: 16, fontStyle: 'italic' }}>
                      "Game-changer for staying informed. Processing speed is incredible."
                    </Text>
                    <div>
                      <Text strong>Mike Chen</Text>
                      <br />
                      <Text type="secondary">CTO, StartupCo</Text>
                    </div>
                  </Space>
                </Card>
              </Col>
              
              <Col xs={24} md={8}>
                <Card style={{ height: '100%' }}>
                  <Space direction="vertical" size="middle">
                    <Text style={{ fontSize: 16, fontStyle: 'italic' }}>
                      "Finally, our team stays on top of industry news effortlessly."
                    </Text>
                    <div>
                      <Text strong>Alex Rodriguez</Text>
                      <br />
                      <Text type="secondary">VP Marketing, GrowthCorp</Text>
                    </div>
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