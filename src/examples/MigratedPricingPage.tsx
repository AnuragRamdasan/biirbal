// Example: Migrated Pricing Page using new BaseLayout system
'use client'

import { useState, useEffect } from 'react'
import { getPlanPrice } from '@/lib/stripe'
import { Button, Card } from '@/components/ui/DesignSystem'
import { BaseLayout, ContentLayout } from '@/components/layout/BaseLayout'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

// Using Ant Design for complex components, but wrapping in our design system
import { Row, Col, Space, List, Statistic, Switch, Slider } from 'antd'
import { 
  CheckOutlined, 
  CrownOutlined, 
  RocketOutlined,
  LoadingOutlined 
} from '@ant-design/icons'

interface PricingPlan {
  id: string
  name: string
  description: string
  price: number
  features: string[]
  isPopular?: boolean
  stripePriceId?: string
}

const PricingPageExample = () => {
  const [loading, setLoading] = useState<string | null>(null)
  const [isAnnual, setIsAnnual] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)

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
      id: 'pro',
      name: 'Pro',
      description: 'For growing teams',
      price: isAnnual ? 399.00 : 39.00,
      isPopular: true,
      features: [
        'Unlimited audio summaries',
        'Up to 10 team members',
        '30s processing time',
        'Advanced analytics & reports',
        'Priority support',
      ]
    }
  ]

  const handleSubscribe = async (planId: string) => {
    setLoading(planId)
    // Subscription logic here
    setTimeout(() => setLoading(null), 2000)
  }

  return (
    <ContentLayout
      currentPage="pricing"
      title="Choose Your Plan"
      subtitle="Start with our free trial and scale as your team grows"
    >
      {/* Discount Banner using design tokens */}
      <div 
        className="mb-12 p-6 rounded-2xl text-white text-center relative overflow-hidden"
        style={{
          background: designTokens.colors.brand.gradient.primary,
          borderRadius: designTokens.borderRadius['2xl'],
          boxShadow: designTokens.shadow.lg
        }}
      >
        <div className="relative z-10">
          <p className="text-lg font-medium">
            💰 <strong>20% discount available</strong> for non-profits and startups.{' '}
            <a href="mailto:hello@biirbal.ai" className="underline font-semibold">
              Contact us
            </a>
          </p>
        </div>
      </div>

      {/* Billing Toggle */}
      <div className="text-center mb-12">
        <Card variant="glass" padding="lg" className="max-w-md mx-auto">
          <Space align="center" size="large">
            <span 
              className={cn(
                'text-base font-medium transition-colors',
                isAnnual ? 'text-gray-600' : 'text-gray-900'
              )}
            >
              Monthly
            </span>
            <Switch 
              checked={isAnnual}
              onChange={setIsAnnual}
              size="default"
            />
            <span 
              className={cn(
                'text-base font-medium transition-colors',
                isAnnual ? 'text-gray-900' : 'text-gray-600'
              )}
            >
              Annual
            </span>
            {isAnnual && (
              <div 
                className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                style={{
                  background: designTokens.colors.semantic.success[500]
                }}
              >
                Get 2 Months Free
              </div>
            )}
          </Space>
        </Card>
      </div>

      {/* Pricing Cards */}
      <Row gutter={[32, 32]} justify="center">
        {plans.map((plan) => (
          <Col xs={24} sm={12} md={8} key={plan.id}>
            <Card
              variant={plan.isPopular ? "elevated" : "default"}
              padding="lg"
              className={cn(
                'h-full relative transition-all duration-300',
                plan.isPopular && 'border-2 border-blue-500 scale-105'
              )}
              hover={true}
            >
              {plan.isPopular && (
                <div 
                  className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white"
                  style={{
                    background: designTokens.colors.brand.primary[600]
                  }}
                >
                  Most Popular
                </div>
              )}

              <div className="text-center mb-6">
                <h3 
                  className="text-2xl font-bold mb-2"
                  style={{ color: designTokens.colors.neutral[900] }}
                >
                  {plan.name}
                  {plan.name === 'Pro' && (
                    <CrownOutlined className="ml-2 text-yellow-500" />
                  )}
                </h3>
                
                <p 
                  className="text-base mb-4"
                  style={{ color: designTokens.colors.neutral[600] }}
                >
                  {plan.description}
                </p>
                
                <div className="mb-4">
                  <Statistic
                    value={getPlanPrice(plan, isAnnual)}
                    prefix="$"
                    suffix={plan.price > 0 ? (isAnnual ? '/year' : '/month') : ''}
                    valueStyle={{ 
                      fontSize: '2.5rem',
                      fontWeight: 'bold',
                      color: plan.isPopular 
                        ? designTokens.colors.brand.primary[600] 
                        : designTokens.colors.neutral[900]
                    }}
                  />
                  {isAnnual && plan.price > 0 && (
                    <p 
                      className="text-sm mt-1"
                      style={{ color: designTokens.colors.neutral[600] }}
                    >
                      ${(getPlanPrice(plan, isAnnual) / 12).toFixed(2)}/month billed annually
                    </p>
                  )}
                </div>
              </div>

              <List
                dataSource={plan.features}
                renderItem={(feature) => (
                  <List.Item style={{ border: 'none', padding: '4px 0' }}>
                    <Space>
                      <CheckOutlined style={{ color: designTokens.colors.semantic.success[500] }} />
                      <span style={{ color: designTokens.colors.neutral[700] }}>
                        {feature}
                      </span>
                    </Space>
                  </List.Item>
                )}
                className="mb-6"
              />

              <div className="mt-auto">
                {currentPlan === plan.id ? (
                  <Button 
                    variant="success"
                    size="lg"
                    fullWidth
                    disabled
                    icon={<CheckOutlined />}
                  >
                    Current Plan
                  </Button>
                ) : plan.id === 'free' ? (
                  <Button 
                    variant="secondary"
                    size="lg"
                    fullWidth
                    icon={<RocketOutlined />}
                  >
                    <a href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                      Start Free Trial
                    </a>
                  </Button>
                ) : (
                  <Button 
                    variant={plan.isPopular ? 'primary' : 'secondary'}
                    size="lg"
                    fullWidth
                    loading={loading === plan.id}
                    icon={loading === plan.id ? <LoadingOutlined /> : <CrownOutlined />}
                    onClick={() => handleSubscribe(plan.id)}
                  >
                    {currentPlan ? 'Change Plan' : 'Get Started'}
                  </Button>
                )}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* FAQ Section */}
      <div className="mt-16">
        <h2 
          className="text-3xl font-bold text-center mb-8"
          style={{ color: designTokens.colors.neutral[900] }}
        >
          Frequently Asked Questions
        </h2>
        
        <div className="max-w-4xl mx-auto space-y-4">
          {[
            {
              question: 'How does the free plan work?',
              answer: 'You get 20 audio summaries completely free for 1 user. No credit card required to start.'
            },
            {
              question: 'Can I change plans later?',
              answer: 'Yes, you can upgrade or downgrade your plan at any time from your dashboard.'
            }
          ].map((faq, index) => (
            <Card key={index} variant="bordered" padding="lg">
              <h3 
                className="text-lg font-semibold mb-2"
                style={{ color: designTokens.colors.neutral[900] }}
              >
                {faq.question}
              </h3>
              <p style={{ color: designTokens.colors.neutral[600] }}>
                {faq.answer}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </ContentLayout>
  )
}

export default PricingPageExample