'use client'

import { useState } from 'react'
import { PRICING_PLANS } from '@/lib/stripe'

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start with our free trial, then choose the plan that fits your team's needs.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {/* Free Trial */}
          <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-200">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Free Trial</h3>
              <div className="text-3xl font-bold mb-4">$0</div>
              <p className="text-gray-600 text-sm mb-6">Perfect for testing</p>
              
              <ul className="text-left space-y-2 mb-6">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  50 links per month
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  All core features
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  7-day trial
                </li>
              </ul>

              <a
                href="/"
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors inline-block text-center"
              >
                Start Free Trial
              </a>
            </div>
          </div>

          {/* Paid Plans */}
          {Object.values(PRICING_PLANS).map((plan) => (
            <div 
              key={plan.id}
              className={`bg-white p-6 rounded-lg shadow-lg border-2 ${
                plan.id === 'pro' ? 'border-blue-500 relative' : 'border-gray-200'
              }`}
            >
              {plan.id === 'pro' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    POPULAR
                  </span>
                </div>
              )}
              
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold mb-1">${plan.price}</div>
                <p className="text-gray-500 text-sm mb-6">per month</p>
                
                <ul className="text-left space-y-2 mb-6">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    {plan.monthlyLimit} links per month
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    All core features
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Priority support
                  </li>
                  {plan.id === 'enterprise' && (
                    <>
                      <li className="flex items-center">
                        <span className="text-green-500 mr-2">✓</span>
                        Custom integrations
                      </li>
                      <li className="flex items-center">
                        <span className="text-green-500 mr-2">✓</span>
                        Dedicated support
                      </li>
                    </>
                  )}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading === plan.id}
                  className={`w-full py-2 px-4 rounded-lg transition-colors ${
                    plan.id === 'pro'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  } ${loading === plan.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading === plan.id ? 'Processing...' : `Choose ${plan.name}`}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <h2 className="text-2xl font-bold mb-8">Frequently Asked Questions</h2>
          
          <div className="max-w-3xl mx-auto text-left">
            <div className="bg-white p-6 rounded-lg shadow-lg mb-4">
              <h3 className="font-semibold mb-2">How does the free trial work?</h3>
              <p className="text-gray-600">
                You get 50 free link summaries to test the service. No credit card required.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-lg mb-4">
              <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-600">
                Yes, you can cancel your subscription at any time through the billing portal.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-lg mb-4">
              <h3 className="font-semibold mb-2">What happens if I exceed my limit?</h3>
              <p className="text-gray-600">
                The bot will notify you when you approach your limit. Links shared after the limit won't be processed until the next billing cycle.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}