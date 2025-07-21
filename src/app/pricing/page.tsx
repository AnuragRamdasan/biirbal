'use client'

import { useState, useEffect } from 'react'
import { getPlanPrice } from '@/lib/stripe'
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
  CheckCircleOutlined,
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
import { useAnalytics } from '@/hooks/useAnalytics'

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
  
  // Initialize analytics
  const analytics = useAnalytics({
    autoTrackPageViews: true,
    trackScrollDepth: true
  })
  
  // Track pricing page visit
  useEffect(() => {
    analytics.trackFeature('pricing_page_visit', {
      initial_annual_toggle: isAnnual,
      initial_links_per_week: linksPerWeek,
      initial_team_size: teamSize
    })
  }, [])

  const handleSubscribe = async (planId: string) => {
    setLoading(planId)
    
    // Track checkout attempt
    analytics.trackConversion('checkout_initiated', plans.find(p => p.id === planId)?.price)
    analytics.trackFeature('plan_selected', {
      plan_id: planId,
      is_annual: isAnnual,
      team_size_input: teamSize,
      links_per_week_input: linksPerWeek
    })
    
    try {
      // Get team ID from localStorage
      const teamId = localStorage.getItem('biirbal_team_id')
      
      if (!teamId) {
        analytics.trackFeature('checkout_blocked_no_team', { plan_id: planId })
        alert('Please install the biirbal.ai Slack app first to access subscription plans.')
        window.location.href = '/'
        return
      }

      // Debug: Log the team ID being used
      console.log('Using team ID:', teamId)

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, teamId, isAnnual })
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
        // Track successful checkout redirect
        analytics.trackConversion('checkout_redirect_success', plans.find(p => p.id === planId)?.price)
        window.location.href = url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error) {
      console.error('Checkout failed:', error)
      
      // Track checkout failure
      analytics.trackFeature('checkout_failed', {
        plan_id: planId,
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      
      alert(`Failed to start checkout: ${error instanceof Error ? error.message : 'Please try again.'}`)
    } finally {
      setLoading(null)
    }
  }

  const plans: PricingPlan[] = [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for individuals getting started',
      price: 0,
      features: [
        '20 audio summaries per month',
        '1 user',
        '2-5 min processing time',
        'Basic Slack integration',
        'Community support'
      ]
    },
    {
      id: 'starter',
      name: 'Starter',
      description: 'For individual power users',
      price: isAnnual ? 99.00 : 9.00,
      stripePriceId: 'price_starter',
      features: [
        'Unlimited audio summaries',
        '1 user',
        '1-2 min processing time',
        'Basic analytics',
        'Email support'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'For growing teams',
      price: isAnnual ? 399.00 : 39.00,
      isPopular: true,
      stripePriceId: 'price_pro',
      features: [
        'Unlimited audio summaries',
        'Up to 10 team members',
        '30s processing time',
        'Advanced analytics & reports',
        'Priority support',
      ]
    },
    {
      id: 'business',
      name: 'Business',
      description: 'For large organizations',
      price: isAnnual ? 900.00 : 99.00,
      stripePriceId: 'price_business',
      features: [
        'Unlimited audio summaries',
        'Unlimited team members',
        '15s processing time',
        'Advanced analytics & reporting',
        'Priority support',
      ]
    }
  ]

  const faqItems = [
    {
      question: 'How does the free plan work?',
      answer: 'You get 20 audio summaries completely free for 1 user. No credit card required to start. Upgrade anytime to unlock unlimited links and more users.'
    },
    {
      question: 'How fast is the processing?',
      answer: 'Free: 2-5 minutes, Starter: 1-2 minutes, Pro: 30 seconds, Business: 15 seconds. Most teams see immediate productivity gains with faster processing.'
    },
    {
      question: 'Can I change plans later?',
      answer: 'Yes, you can upgrade or downgrade your plan at any time from your dashboard. Changes take effect immediately.'
    },
    {
      question: 'What happens to my summaries if I cancel?',
      answer: 'Your summaries remain accessible for 30 days after cancellation to allow for data export.'
    },
    {
      question: 'What happens to my data if I cancel?',
      answer: 'Your data remains accessible for 30 days after cancellation to allow for data export.'
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
                      onChange={(value) => {
                        setLinksPerWeek(value)
                        analytics.trackFeature('calculator_links_changed', {
                          links_per_week: value,
                          team_size: teamSize
                        })
                      }}
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
                      onChange={(value) => {
                        setTeamSize(value)
                        analytics.trackFeature('calculator_team_size_changed', {
                          team_size: value,
                          links_per_week: linksPerWeek
                        })
                      }}
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
                       teamSize <= 1 ? (linksPerWeek * 4 <= 20 ? 'Free' : 'Starter') :
                       teamSize <= 10 ? 'Pro' : 
                       'Business'
                     }
                   </Text>
                   <br />
                   <Text type="secondary">
                     {teamSize <= 1 
                       ? (linksPerWeek * 4 <= 20 ? 'Perfect for getting started!' : 'Great for individual power users')
                       : teamSize <= 10
                       ? 'Ideal for growing teams with advanced features'
                       : 'Best for large organizations needing unlimited seats'
                     }
                   </Text>
                </div>
              </Space>
            </Card>
          </div>
        </div>

        {/* Pricing Cards */}
        <div style={{ textAlign: 'center', padding: '60px 0', background: '#f8f9fa' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Badge style={{ backgroundColor: '#52c41a' }}>
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
            </Space>
          </div>
        </div>

        <div style={{ padding: '80px 0' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>
            
            {/* Monthly/Annual Toggle */}
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <Space align="center" size="large">
                <Text style={{ fontSize: 16, fontWeight: 500 }}>Monthly</Text>
                <Switch 
                  checked={isAnnual}
                  onChange={(checked) => {
                    setIsAnnual(checked)
                    analytics.trackFeature('billing_toggle_changed', {
                      is_annual: checked,
                      team_size: teamSize,
                      links_per_week: linksPerWeek
                    })
                  }}
                  style={{ backgroundColor: isAnnual ? '#1890ff' : '#d9d9d9' }}
                />
                <Text style={{ fontSize: 16, fontWeight: 500 }}>Annual</Text>
                {isAnnual && (
                  <Badge count="Get 2 Months Free" style={{ backgroundColor: '#52c41a', marginLeft: 8 }} />
                )}
              </Space>
            </div>
            <Row gutter={[48, 48]} justify="center">
              {plans.map((plan) => (
                <Col xs={24} sm={12} md={6} key={plan.id}>
                  <Card
                    style={{ 
                      height: '100%',
                      position: 'relative',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      padding: '8px',
                      margin: '8px',
                      ...(plan.isPopular && {
                        border: '2px solid #1890ff',
                        transform: 'scale(1.02)',
                        zIndex: 1,
                        boxShadow: '0 8px 32px rgba(24, 144, 255, 0.12)'
                      })
                    }}
                    hoverable
                  >
                    {plan.isPopular && (
                      <div style={{
                        position: 'absolute',
                        top: -8,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 2
                      }}>
                        <Badge 
                          count="Most Popular" 
                          style={{ 
                            backgroundColor: '#1890ff',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            borderRadius: '12px',
                            padding: '4px 12px',
                            height: 'auto'
                          }} 
                        />
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
                            value={getPlanPrice(plan, isAnnual)}
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
                              ${(getPlanPrice(plan, isAnnual) / 12).toFixed(2)}/month billed annually
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