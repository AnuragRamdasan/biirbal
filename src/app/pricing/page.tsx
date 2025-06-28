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
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-20">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start with our free trial, then choose the plan that fits your team's needs.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {/* Free Trial */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Free Trial</h3>
              <div className="text-3xl font-bold mb-2 text-gray-900">$0</div>
              <p className="text-gray-500 text-sm mb-6">Perfect for testing</p>
              
              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-center">
                  <span className="text-indigo-500 mr-3">✓</span>
                  <span className="text-gray-700">50 links per month</span>
                </li>
                <li className="flex items-center">
                  <span className="text-indigo-500 mr-3">✓</span>
                  <span className="text-gray-700">All core features</span>
                </li>
                <li className="flex items-center">
                  <span className="text-indigo-500 mr-3">✓</span>
                  <span className="text-gray-700">7-day trial</span>
                </li>
              </ul>

              <a
                href="/"
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors inline-block text-center font-medium"
              >
                Start Free Trial
              </a>
            </div>
          </div>

          {/* Paid Plans */}
          {Object.values(PRICING_PLANS).map((plan) => (
            <div 
              key={plan.id}
              className={`bg-white p-8 rounded-2xl shadow-sm border-2 ${
                plan.id === 'pro' ? 'border-indigo-200 relative' : 'border-gray-100'
              }`}
            >
              {plan.id === 'pro' && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                    POPULAR
                  </span>
                </div>
              )}
              
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-3 text-gray-900">{plan.name}</h3>
                <div className="text-3xl font-bold mb-2 text-gray-900">${plan.price}</div>
                <p className="text-gray-500 text-sm mb-6">per month</p>
                
                <ul className="text-left space-y-3 mb-8">
                  <li className="flex items-center">
                    <span className="text-indigo-500 mr-3">✓</span>
                    <span className="text-gray-700">{plan.monthlyLimit} links per month</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-indigo-500 mr-3">✓</span>
                    <span className="text-gray-700">All core features</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-indigo-500 mr-3">✓</span>
                    <span className="text-gray-700">Priority support</span>
                  </li>
                  {plan.id === 'enterprise' && (
                    <>
                      <li className="flex items-center">
                        <span className="text-indigo-500 mr-3">✓</span>
                        <span className="text-gray-700">Custom integrations</span>
                      </li>
                      <li className="flex items-center">
                        <span className="text-indigo-500 mr-3">✓</span>
                        <span className="text-gray-700">Dedicated support</span>
                      </li>
                    </>
                  )}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading === plan.id}
                  className={`w-full py-3 px-4 rounded-xl transition-colors font-medium ${
                    plan.id === 'pro'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } ${loading === plan.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading === plan.id ? 'Processing...' : `Choose ${plan.name}`}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-20">
          <h2 className="text-3xl font-bold mb-12 text-gray-900">Frequently Asked Questions</h2>
          
          <div className="max-w-3xl mx-auto text-left">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-6">
              <h3 className="font-semibold mb-3 text-gray-900">How does the free trial work?</h3>
              <p className="text-gray-600 leading-relaxed">
                You get 50 free link summaries to test the service. No credit card required.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-6">
              <h3 className="font-semibold mb-3 text-gray-900">Can I cancel anytime?</h3>
              <p className="text-gray-600 leading-relaxed">
                Yes, you can cancel your subscription at any time through the billing portal.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-6">
              <h3 className="font-semibold mb-3 text-gray-900">What happens if I exceed my limit?</h3>
              <p className="text-gray-600 leading-relaxed">
                The bot will notify you when you approach your limit. Links shared after the limit won't be processed until the next billing cycle.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}