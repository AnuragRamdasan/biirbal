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
  QuestionCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons'
import Layout from '@/components/layout/Layout'
import { useAnalytics } from '@/hooks/useAnalytics'

const { Title, Text, Paragraph } = Typography

// Add spinner animation CSS
const spinnerStyle = `
  @keyframes spin {
    0% { transform: translateY(-50%) rotate(0deg); }
    100% { transform: translateY(-50%) rotate(360deg); }
  }
`

// Inject the CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = spinnerStyle
  document.head.appendChild(style)
}

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
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [couponCode, setCouponCode] = useState('')
  const [couponValidation, setCouponValidation] = useState<{
    valid: boolean
    loading: boolean
    discount?: { type: string, amount: number, name?: string }
    error?: string
  }>({ valid: false, loading: false })
  
  // Initialize analytics
  const analytics = useAnalytics({
    autoTrackPageViews: true,
    trackScrollDepth: true
  })
  
  // Fetch current plan
  useEffect(() => {
    const fetchCurrentPlan = async () => {
      try {
        const userId = localStorage.getItem('biirbal_user_id')
        if (!userId) return
        
        const response = await fetch(`/api/dashboard/usage?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          setCurrentPlan(data.plan?.id || 'free')
        }
      } catch (error) {
        console.error('Failed to fetch current plan:', error)
      }
    }
    
    fetchCurrentPlan()
  }, [])

  // Track pricing page visit
  useEffect(() => {
    analytics.trackFeature('pricing_page_visit', {
      initial_annual_toggle: isAnnual,
      initial_links_per_week: linksPerWeek,
      initial_team_size: teamSize
    })
  }, [])

  // Validate coupon code
  const validateCoupon = async (code: string) => {
    if (!code.trim()) {
      setCouponValidation({ valid: false, loading: false })
      return
    }

    setCouponValidation({ valid: false, loading: true })
    
    try {
      const response = await fetch('/api/stripe/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode: code.trim() })
      })

      const data = await response.json()

      if (response.ok && data.valid) {
        setCouponValidation({
          valid: true,
          loading: false,
          discount: data.discount
        })
      } else {
        setCouponValidation({
          valid: false,
          loading: false,
          error: data.error || 'Invalid coupon code'
        })
      }
    } catch (error) {
      setCouponValidation({
        valid: false,
        loading: false,
        error: 'Failed to validate coupon'
      })
    }
  }

  // Debounced coupon validation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      validateCoupon(couponCode)
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId)
  }, [couponCode])

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
      // Get user ID from localStorage
      const userId = localStorage.getItem('biirbal_user_id')
      
      if (!userId) {
        analytics.trackFeature('checkout_blocked_no_user', { plan_id: planId })
        alert('Please log in first to access subscription plans.')
        window.location.href = '/'
        return
      }

      // Debug: Log the user ID being used
      console.log('Using user ID:', userId)

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          planId, 
          userId, 
          isAnnual,
          couponCode: couponValidation.valid ? couponCode.trim() : undefined
        })
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

  // Calculate discounted price
  const getDiscountedPrice = (originalPrice: number) => {
    if (!couponValidation.valid || !couponValidation.discount) {
      return originalPrice
    }

    const { type, amount } = couponValidation.discount
    if (type === 'percent') {
      return originalPrice * (1 - amount / 100)
    } else if (type === 'amount') {
      return Math.max(0, originalPrice - (amount / 100)) // amount is in cents
    }
    return originalPrice
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
      <div style={{ 
        padding: '32px 0',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
        minHeight: '100vh'
      }}>
        {/* Modern Special Discount Banner */}
        <div style={{ 
          background: 'linear-gradient(135deg, #001529 0%, #003a70 100%)',
          color: 'white', 
          padding: '20px 0',
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
            background: 'radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.05) 0%, transparent 50%)',
            pointerEvents: 'none'
          }} />
          
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <Text style={{ 
              color: 'rgba(255,255,255,0.95)', 
              fontSize: '16px',
              fontWeight: 500
            }}>
              💰 <strong>20% discount available</strong> for non-profits, startups, and open source groups.{' '}
              <a href="mailto:hello@biirbal.ai?subject=Special Discount Inquiry" style={{ 
                color: '#52c41a',
                textDecoration: 'none',
                fontWeight: '600'
              }}>
                Contact us
              </a> to learn more.
            </Text>
          </div>
        </div>

        {/* Modern Social Proof & Urgency */}
        <div style={{ 
          padding: '60px 0', 
          background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f8ff 100%)',
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
            background: 'radial-gradient(circle at 20% 80%, rgba(24, 144, 255, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(24, 144, 255, 0.05) 0%, transparent 50%)',
            pointerEvents: 'none'
          }} />
          
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <Space direction="vertical" size="large">
              <div style={{
                background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
                borderRadius: '50px',
                padding: '8px 24px',
                display: 'inline-block',
                boxShadow: '0 8px 24px rgba(24, 144, 255, 0.3)'
              }}>
                <Text style={{ 
                  fontSize: '18px', 
                  color: 'white', 
                  fontWeight: 600 
                }}>
                  🔥 Join 500+ teams who've already saved 1000+ hours
                </Text>
              </div>
              <Text style={{ 
                color: '#666',
                fontSize: '16px',
                maxWidth: '600px',
                margin: '0 auto'
              }}>
                Don't let important content slip through the cracks while your competitors stay ahead
              </Text>
            </Space>
          </div>
        </div>

        {/* Modern Usage Calculator */}
        <div style={{ 
          padding: '80px 0', 
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
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
            background: 'radial-gradient(circle at 20% 80%, rgba(102, 126, 234, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(102, 126, 234, 0.03) 0%, transparent 50%)',
            pointerEvents: 'none'
          }} />
          
          <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <Title level={3} style={{ 
                fontSize: '32px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '16px'
              }}>
                Find Your Perfect Plan
              </Title>
              <Text style={{ 
                color: '#666',
                fontSize: '18px',
                maxWidth: '500px',
                margin: '0 auto'
              }}>
                Answer a few questions to see which plan fits your team
              </Text>
            </div>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(102, 126, 234, 0.1)',
              borderRadius: '24px',
              padding: '32px',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Background Accent */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }} />
              
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <Text strong style={{ 
                    fontSize: '16px',
                    color: '#333',
                    marginBottom: '16px',
                    display: 'block'
                  }}>
                    How many links does your team share per week?
                  </Text>
                  <div style={{ margin: '20px 0' }}>
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
                      trackStyle={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                      handleStyle={{ 
                        borderColor: '#667eea',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                      }}
                    />
                  </div>
                  <Text style={{ 
                    color: '#666',
                    fontSize: '14px'
                  }}>
                    Currently: {linksPerWeek} links/week (~{linksPerWeek * 4} links/month)
                  </Text>
                </div>
                
                <div>
                  <Text strong style={{ 
                    fontSize: '16px',
                    color: '#333',
                    marginBottom: '16px',
                    display: 'block'
                  }}>
                    How many team members need access?
                  </Text>
                  <div style={{ margin: '20px 0' }}>
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
                      trackStyle={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                      handleStyle={{ 
                        borderColor: '#667eea',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                      }}
                    />
                  </div>
                  <Text style={{ 
                    color: '#666',
                    fontSize: '14px'
                  }}>
                    Currently: {teamSize} team members
                  </Text>
                </div>
                
                <div style={{ 
                  textAlign: 'center', 
                  marginTop: '32px', 
                  padding: '24px', 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '16px',
                  color: 'white'
                }}>
                  <Text strong style={{ 
                    fontSize: '20px', 
                    color: 'white',
                    marginBottom: '8px',
                    display: 'block'
                  }}>
                    Recommended Plan: {
                      teamSize <= 1 ? (linksPerWeek * 4 <= 20 ? 'Free' : 'Starter') :
                      teamSize <= 10 ? 'Pro' : 
                      'Business'
                    }
                  </Text>
                  <Text style={{ 
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '14px'
                  }}>
                    {teamSize <= 1 
                      ? (linksPerWeek * 4 <= 20 ? 'Perfect for getting started!' : 'Great for individual power users')
                      : teamSize <= 10
                      ? 'Ideal for growing teams with advanced features'
                      : 'Best for large organizations needing unlimited seats'
                    }
                  </Text>
                </div>
              </Space>
            </div>
          </div>
        </div>

        {/* Modern Pricing Cards */}
        <div style={{ 
          textAlign: 'center', 
          padding: '80px 0', 
          background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
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
            background: 'radial-gradient(circle at 20% 80%, rgba(102, 126, 234, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(102, 126, 234, 0.03) 0%, transparent 50%)',
            pointerEvents: 'none'
          }} />
          
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
            <Space direction="vertical" size="large" style={{ width: '100%', marginBottom: '60px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                borderRadius: '50px',
                padding: '8px 24px',
                display: 'inline-block',
                boxShadow: '0 8px 24px rgba(82, 196, 26, 0.3)'
              }}>
                <Title level={1} style={{ 
                  margin: 0,
                  color: 'white',
                  fontSize: '36px',
                  fontWeight: 700
                }}>
                  <Space>
                    <CrownOutlined />
                    Choose Your Plan
                  </Space>
                </Title>
              </div>
              
              <Paragraph style={{ 
                fontSize: '20px', 
                color: '#666', 
                maxWidth: 600, 
                margin: '0 auto',
                lineHeight: '1.6'
              }}>
                Start with our free trial and scale as your team grows. 
                All plans include core AI summarization features.
              </Paragraph>
            </Space>
          </div>
        </div>

        <div style={{ 
          padding: '80px 0',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
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
            background: 'radial-gradient(circle at 20% 80%, rgba(102, 126, 234, 0.02) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(102, 126, 234, 0.02) 0%, transparent 50%)',
            pointerEvents: 'none'
          }} />
          
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px', position: 'relative', zIndex: 1 }}>
            
            {/* Modern Monthly/Annual Toggle */}
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '60px',
              padding: '24px',
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              border: '1px solid rgba(102, 126, 234, 0.1)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)',
              maxWidth: '400px',
              margin: '0 auto 60px auto'
            }}>
              <Space align="center" size="large">
                <Text style={{ 
                  fontSize: '16px', 
                  fontWeight: 500,
                  color: isAnnual ? '#666' : '#333'
                }}>
                  Monthly
                </Text>
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
                  style={{ 
                    backgroundColor: isAnnual ? '#667eea' : '#d9d9d9'
                  }}
                />
                <Text style={{ 
                  fontSize: '16px', 
                  fontWeight: 500,
                  color: isAnnual ? '#333' : '#666'
                }}>
                  Annual
                </Text>
                {isAnnual && (
                  <div style={{
                    background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                    borderRadius: '50px',
                    padding: '4px 12px',
                    fontSize: '12px',
                    color: 'white',
                    fontWeight: '600'
                  }}>
                    Get 2 Months Free
                  </div>
                )}
              </Space>
            </div>

            {/* Coupon Code Input */}
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '60px',
              padding: '24px',
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              border: '1px solid rgba(102, 126, 234, 0.1)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)',
              maxWidth: '400px',
              margin: '0 auto 60px auto'
            }}>
              <Text style={{ 
                fontSize: '16px', 
                fontWeight: 600,
                color: '#333',
                marginBottom: '16px',
                display: 'block'
              }}>
                Have a coupon code?
              </Text>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14px',
                    border: `2px solid ${
                      couponValidation.loading 
                        ? '#1890ff' 
                        : couponValidation.valid 
                        ? '#52c41a' 
                        : couponValidation.error 
                        ? '#ff4d4f' 
                        : '#d9d9d9'
                    }`,
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'border-color 0.3s ease'
                  }}
                />
                {couponValidation.loading && (
                  <div style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '16px',
                    height: '16px',
                    border: '2px solid #1890ff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                )}
              </div>
              
              {couponValidation.valid && couponValidation.discount && (
                <div style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  background: '#f6ffed',
                  border: '1px solid #b7eb8f',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#52c41a',
                  fontWeight: '500'
                }}>
                  ✓ {couponValidation.discount.name || 'Coupon'} applied! 
                  {couponValidation.discount.type === 'percent' 
                    ? ` ${couponValidation.discount.amount}% discount`
                    : ` $${(couponValidation.discount.amount / 100).toFixed(2)} off`
                  }
                </div>
              )}
              
              {couponValidation.error && (
                <div style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  background: '#fff2f0',
                  border: '1px solid #ffccc7',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#ff4d4f',
                  fontWeight: '500'
                }}>
                  ✗ {couponValidation.error}
                </div>
              )}
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
                      ...(plan.isPopular && !currentPlan && {
                        border: '2px solid #1890ff',
                        transform: 'scale(1.02)',
                        zIndex: 1,
                        boxShadow: '0 8px 32px rgba(24, 144, 255, 0.12)'
                      }),
                      ...(currentPlan === plan.id && {
                        border: '2px solid #52c41a',
                        background: 'linear-gradient(145deg, #f6ffed 0%, #fff 100%)',
                        transform: 'scale(1.02)',
                        zIndex: 2,
                        boxShadow: '0 8px 32px rgba(82, 196, 26, 0.15)'
                      })
                    }}
                    hoverable
                  >
                    {plan.isPopular && !currentPlan && (
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

                    {currentPlan === plan.id && (
                      <div style={{
                        position: 'absolute',
                        top: -8,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 3
                      }}>
                        <Badge 
                          count="Current Plan" 
                          style={{ 
                            backgroundColor: '#52c41a',
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
                          {couponValidation.valid && plan.price > 0 ? (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <Statistic
                                  value={getPlanPrice(plan, isAnnual)}
                                  prefix="$"
                                  suffix={plan.price > 0 ? (isAnnual ? '/year' : '/month') : ''}
                                  valueStyle={{ 
                                    fontSize: 24, 
                                    fontWeight: 'normal',
                                    color: '#999',
                                    textDecoration: 'line-through'
                                  }}
                                />
                              </div>
                              <Statistic
                                value={getDiscountedPrice(getPlanPrice(plan, isAnnual))}
                                prefix="$"
                                suffix={plan.price > 0 ? (isAnnual ? '/year' : '/month') : ''}
                                valueStyle={{ 
                                  fontSize: 36, 
                                  fontWeight: 'bold',
                                  color: '#52c41a'
                                }}
                              />
                            </div>
                          ) : (
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
                          )}
                          {isAnnual && plan.price > 0 && (
                            <Text type="secondary">
                              ${couponValidation.valid 
                                ? (getDiscountedPrice(getPlanPrice(plan, isAnnual)) / 12).toFixed(2)
                                : (getPlanPrice(plan, isAnnual) / 12).toFixed(2)
                              }/month billed annually
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
                      {currentPlan === plan.id ? (
                        <Button 
                          type="primary" 
                          size="large" 
                          icon={<CheckOutlined />}
                          disabled
                          style={{ 
                            width: '100%', 
                            height: 48,
                            background: '#52c41a',
                            borderColor: '#52c41a'
                          }}
                        >
                          Current Plan
                        </Button>
                      ) : plan.id === 'free' ? (
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
                          type={plan.isPopular && !currentPlan ? 'primary' : 'default'}
                          size="large" 
                          icon={loading === plan.id ? <LoadingOutlined /> : <CrownOutlined />}
                          loading={loading === plan.id}
                          onClick={() => handleSubscribe(plan.id)}
                          style={{ 
                            width: '100%', 
                            height: 48,
                            ...(plan.isPopular && !currentPlan && { 
                              background: '#1890ff',
                              borderColor: '#1890ff'
                            })
                          }}
                        >
                          {currentPlan ? 'Change Plan' : 'Get Started'}
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