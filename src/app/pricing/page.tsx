'use client'

import { useState } from 'react'
import { PRICING_PLANS } from '@/lib/stripe'
import Script from 'next/script'
import Layout from '@/components/layout/Layout'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)

  const handleSubscribe = async (planId: string) => {
    setLoading(planId)
    
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, teamId: 'demo' }) // In real app, get from auth
      })

      const { url } = await response.json()
      
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Checkout failed:', error)
      alert('Failed to start checkout. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <Layout currentPage="pricing">
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
            "itemListElement": [
              {
                "@type": "Product",
                "position": 1,
                "name": "Starter Plan",
                "description": "Perfect for small teams",
                "offers": {
                  "@type": "Offer",
                  "price": "9.99",
                  "priceCurrency": "USD",
                  "priceValidUntil": "2025-12-31",
                  "availability": "https://schema.org/InStock"
                }
              },
              {
                "@type": "Product",
                "position": 2,
                "name": "Pro Plan",
                "description": "Most popular choice for growing teams",
                "offers": {
                  "@type": "Offer",
                  "price": "29.99",
                  "priceCurrency": "USD",
                  "priceValidUntil": "2025-12-31",
                  "availability": "https://schema.org/InStock"
                }
              },
              {
                "@type": "Product",
                "position": 3,
                "name": "Enterprise Plan",
                "description": "For large organizations",
                "offers": {
                  "@type": "Offer",
                  "price": "99.99",
                  "priceCurrency": "USD",
                  "priceValidUntil": "2025-12-31",
                  "availability": "https://schema.org/InStock"
                }
              }
            ]
          }),
        }}
      />
      
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-20">
          <h1 className="text-5xl font-bold text-gray-900 mb-6 flex items-center justify-center gap-3">
            💳 <span>Choose Your Plan</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Start with our free trial, then choose the plan that fits your team's needs.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {/* Free Trial */}
          <Card className="text-center" padding="lg">
            <CardHeader>
              <CardTitle>Free Trial</CardTitle>
              <div className="text-4xl font-bold mb-2 text-gray-900">$0</div>
              <p className="text-gray-500 text-sm mb-6">Perfect for testing</p>
            </CardHeader>
            <CardContent>
              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-center">
                  <span className="text-blue-500 mr-3">✓</span>
                  <span className="text-gray-700">50 links per month</span>
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-3">✓</span>
                  <span className="text-gray-700">All core features</span>
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-3">✓</span>
                  <span className="text-gray-700">7-day trial</span>
                </li>
              </ul>

              <a href="/">
                <Button variant="secondary" className="w-full">
                  Start Free Trial
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* Paid Plans */}
          {Object.values(PRICING_PLANS).map((plan) => (
            <Card 
              key={plan.id}
              className={`text-center relative ${
                plan.id === 'pro' ? 'border-2 border-blue-200 shadow-lg' : ''
              }`}
              padding="lg"
            >
              {plan.id === 'pro' && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 text-sm font-semibold">
                    🔥 POPULAR
                  </Badge>
                </div>
              )}
              
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <div className="text-4xl font-bold mb-2 text-gray-900">${plan.price}</div>
                <p className="text-gray-500 text-sm mb-6">per month</p>
              </CardHeader>
              <CardContent>
                <ul className="text-left space-y-3 mb-8">
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-3">✓</span>
                    <span className="text-gray-700">{plan.monthlyLimit} links per month</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-3">✓</span>
                    <span className="text-gray-700">All core features</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-3">✓</span>
                    <span className="text-gray-700">Priority support</span>
                  </li>
                  {plan.id === 'enterprise' && (
                    <>
                      <li className="flex items-center">
                        <span className="text-blue-500 mr-3">✓</span>
                        <span className="text-gray-700">Custom integrations</span>
                      </li>
                      <li className="flex items-center">
                        <span className="text-blue-500 mr-3">✓</span>
                        <span className="text-gray-700">Dedicated support</span>
                      </li>
                    </>
                  )}
                </ul>

                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  loading={loading === plan.id}
                  variant={plan.id === 'pro' ? 'primary' : 'secondary'}
                  className="w-full"
                >
                  {loading === plan.id ? 'Processing...' : `Choose ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-20">
          <h2 className="text-3xl font-bold mb-12 text-gray-900">Frequently Asked Questions</h2>
          
          <div className="max-w-3xl mx-auto text-left space-y-6">
            <Card padding="lg">
              <h3 className="font-semibold mb-3 text-gray-900">How does the free trial work?</h3>
              <p className="text-gray-600 leading-relaxed">
                You get 50 free link summaries to test the service. No credit card required.
              </p>
            </Card>
            
            <Card padding="lg">
              <h3 className="font-semibold mb-3 text-gray-900">Can I cancel anytime?</h3>
              <p className="text-gray-600 leading-relaxed">
                Yes, you can cancel your subscription at any time through the billing portal.
              </p>
            </Card>
            
            <Card padding="lg">
              <h3 className="font-semibold mb-3 text-gray-900">What happens if I exceed my limit?</h3>
              <p className="text-gray-600 leading-relaxed">
                The bot will notify you when you approach your limit. Links shared after the limit won't be processed until the next billing cycle.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}