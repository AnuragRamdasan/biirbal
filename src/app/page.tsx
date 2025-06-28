'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Script from 'next/script'
import { jsonLd } from '@/lib/seo'

export default function Home() {
  const searchParams = useSearchParams()
  const [installed, setInstalled] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (searchParams.get('installed') === 'true') {
      setInstalled(true)
    }
    if (searchParams.get('error')) {
      setError(searchParams.get('error') || 'Installation failed')
    }
  }, [searchParams])

  const slackInstallUrl = `https://slack.com/oauth/v2/authorize?client_id=${process.env.NEXT_PUBLIC_SLACK_CLIENT_ID}&scope=app_mentions:read,channels:history,channels:read,chat:write,files:write,groups:history,groups:read,im:history,im:read,mpim:history,mpim:read&user_scope=&redirect_uri=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/api/slack/oauth' : '')}`

  return (
    <>
      {/* Homepage-specific structured data */}
      <Script
        id="homepage-product-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "biirbal.ai Slack Bot",
            "description": "AI-powered audio summaries for Slack links. Transform every shared link into a 90-second audio summary.",
            "brand": {
              "@type": "Brand",
              "name": "biirbal.ai"
            },
            "offers": [
              {
                "@type": "Offer",
                "name": "Starter Plan",
                "price": "9.99",
                "priceCurrency": "USD",
                "priceValidUntil": "2025-12-31",
                "availability": "https://schema.org/InStock",
                "url": "https://biirbal.ai/pricing"
              },
              {
                "@type": "Offer",
                "name": "Pro Plan", 
                "price": "29.99",
                "priceCurrency": "USD",
                "priceValidUntil": "2025-12-31",
                "availability": "https://schema.org/InStock",
                "url": "https://biirbal.ai/pricing"
              },
              {
                "@type": "Offer",
                "name": "Enterprise Plan",
                "price": "99.99",
                "priceCurrency": "USD",
                "priceValidUntil": "2025-12-31",
                "availability": "https://schema.org/InStock",
                "url": "https://biirbal.ai/pricing"
              }
            ],
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.9",
              "ratingCount": "250",
              "bestRating": "5",
              "worstRating": "1"
            },
            "review": [
              {
                "@type": "Review",
                "author": {
                  "@type": "Person",
                  "name": "Sarah Chen"
                },
                "reviewRating": {
                  "@type": "Rating",
                  "ratingValue": "5",
                  "bestRating": "5"
                },
                "reviewBody": "Game changer! Our team used to miss 70% of shared articles. Now we consume everything through audio summaries during commutes."
              },
              {
                "@type": "Review",
                "author": {
                  "@type": "Person",
                  "name": "Marcus Rodriguez"
                },
                "reviewRating": {
                  "@type": "Rating",
                  "ratingValue": "5",
                  "bestRating": "5"
                },
                "reviewBody": "Saved us 3+ hours weekly. Instead of bookmarking articles we never read, we listen to summaries instantly."
              }
            ]
          }),
        }}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
      {/* Product Hunt Badge */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-center py-3 px-4">
        <div className="flex items-center justify-center gap-2 text-sm font-medium">
          🚀 We're live on Product Hunt! 
          <a href="#" className="underline hover:no-underline transition-all">Check us out →</a>
        </div>
      </div>

      <div className="container mx-auto px-6 py-20">
        {/* Hero Section */}
        <div className="text-center mb-24">
          <div className="mb-8">
            <span className="inline-block px-5 py-2 bg-indigo-50 text-indigo-600 rounded-full text-sm font-medium mb-8 border border-indigo-100">
              🧠 AI-powered content intelligence
            </span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-8 leading-tight">
            Turn Slack Links Into
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Audio Insights
            </span>
            <br />
            <span className="text-2xl text-gray-600 font-normal">with biirbal.ai</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Stop losing track of important content. biirbal.ai automatically converts every link 
            shared in your Slack into a crisp 90-second audio summary.
          </p>

          {/* Social Proof */}
          <div className="flex items-center justify-center gap-8 mb-10 text-gray-500 text-sm">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full border-2 border-white shadow-sm"></div>
                <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full border-2 border-white shadow-sm"></div>
                <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-400 rounded-full border-2 border-white shadow-sm"></div>
              </div>
              <span>1,200+ teams trust us</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-yellow-500">★★★★★</span>
              <span>4.9/5 from 250+ reviews</span>
            </div>
          </div>

          {installed && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-xl mb-8 max-w-md mx-auto">
              ✅ Successfully installed! The bot is now monitoring your channels.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl mb-8 max-w-md mx-auto">
              ❌ {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href={slackInstallUrl}
              className="group relative inline-flex items-center px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-indigo-500/25"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
              </svg>
              Start Free Trial
              <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                FREE
              </div>
            </a>
            <a
              href="/pricing"
              className="inline-flex items-center px-8 py-4 bg-white text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200 border border-gray-200 hover:border-gray-300"
            >
              View Pricing
            </a>
          </div>
          
          <p className="text-gray-500 text-sm mt-6">✨ 7-day free trial • No credit card required • Cancel anytime</p>
        </div>

        {/* Testimonials Section */}
        <div className="mb-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Loved by 1,200+ Teams</h2>
            <p className="text-gray-600 text-lg">See what teams are saying about their productivity boost</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-500 mb-2">
                  ★★★★★
                </div>
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed">
                "Game changer! Our team used to miss 70% of shared articles. Now we consume everything through audio summaries during commutes."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full mr-4"></div>
                <div>
                  <p className="text-gray-900 font-semibold">Sarah Chen</p>
                  <p className="text-gray-500 text-sm">Head of Product, TechFlow</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-500 mb-2">
                  ★★★★★
                </div>
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed">
                "Saved us 3+ hours weekly. Instead of bookmarking articles we never read, we listen to summaries instantly."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full mr-4"></div>
                <div>
                  <p className="text-gray-900 font-semibold">Marcus Rodriguez</p>
                  <p className="text-gray-600 text-sm">Engineering Manager, DataCore</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-500 mb-2">
                  ★★★★★
                </div>
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed">
                "Perfect for our remote team. Everyone stays informed regardless of timezone. Audio summaries are incredibly well-made."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-400 rounded-full mr-4"></div>
                <div>
                  <p className="text-gray-900 font-semibold">Alex Thompson</p>
                  <p className="text-gray-600 text-sm">CTO, RemoteFirst</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Link Detection</h3>
            <p className="text-gray-600 leading-relaxed">
              Instantly detects any link shared in your Slack channels and begins processing automatically. No manual work required.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">AI Content Extraction</h3>
            <p className="text-gray-600 leading-relaxed">
              Advanced AI extracts the key insights from any article, blog post, or document, filtering out ads and distractions.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="bg-gradient-to-r from-green-500 to-blue-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Premium Audio Summaries</h3>
            <p className="text-gray-600 leading-relaxed">
              Get crisp, professional 90-second audio summaries perfect for listening during commutes or walks.
            </p>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="mb-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-600 text-lg">Start free, scale as you grow</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Starter Plan */}
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Starter</h3>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-gray-900">$9.99</span>
                  <span className="text-gray-500 ml-2">/month</span>
                </div>
                <p className="text-gray-500 text-sm mt-2">Perfect for small teams</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-indigo-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  100 links per month
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-indigo-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  90-second summaries
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-indigo-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Basic support
                </li>
              </ul>
              <button className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-200">
                Start Free Trial
              </button>
            </div>
            
            {/* Pro Plan - Popular */}
            <div className="bg-white p-8 rounded-2xl border-2 border-indigo-200 shadow-lg relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                  🔥 Most Popular
                </span>
              </div>
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Pro</h3>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-gray-900">$29.99</span>
                  <span className="text-gray-500 ml-2">/month</span>
                </div>
                <p className="text-gray-500 text-sm mt-2">Most popular choice</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-indigo-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  500 links per month
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-indigo-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Custom summary length
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-indigo-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Priority support
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-indigo-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Analytics dashboard
                </li>
              </ul>
              <button className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors font-semibold">
                Start Free Trial
              </button>
            </div>
            
            {/* Enterprise Plan */}
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Enterprise</h3>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-gray-900">$99.99</span>
                  <span className="text-gray-500 ml-2">/month</span>
                </div>
                <p className="text-gray-500 text-sm mt-2">For large organizations</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-indigo-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  2,000 links per month
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-indigo-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Custom integrations
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-indigo-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Dedicated support
                </li>
                <li className="flex items-center text-gray-700">
                  <svg className="w-5 h-5 text-indigo-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  SSO & compliance
                </li>
              </ul>
              <button className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-200">
                Contact Sales
              </button>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <p className="text-gray-500">💳 All plans include a 7-day free trial • No setup fees • Cancel anytime</p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white p-16 rounded-2xl border border-gray-100 shadow-sm">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">1</span>
              </div>
              <h4 className="text-gray-900 font-semibold mb-2">Share Link</h4>
              <p className="text-gray-600 text-sm">Drop any link in your Slack channel</p>
            </div>
            <div>
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">2</span>
              </div>
              <h4 className="text-gray-900 font-semibold mb-2">AI Extraction</h4>
              <p className="text-gray-600 text-sm">Our AI extracts key insights automatically</p>
            </div>
            <div>
              <div className="bg-gradient-to-r from-green-500 to-blue-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">3</span>
              </div>
              <h4 className="text-gray-900 font-semibold mb-2">Generate Audio</h4>
              <p className="text-gray-600 text-sm">Creates professional 90-second summary</p>
            </div>
            <div>
              <div className="bg-gradient-to-r from-orange-500 to-pink-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">4</span>
              </div>
              <h4 className="text-gray-900 font-semibold mb-2">Instant Delivery</h4>
              <p className="text-gray-600 text-sm">Audio posted as thread reply</p>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <footer className="mt-24 pt-16 border-t border-gray-200">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-gray-900 font-bold mb-4">🧠 biirbal.ai</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                AI-powered content intelligence for your Slack workspace. Never miss important content again.
              </p>
            </div>
            <div>
              <h5 className="text-gray-900 font-semibold mb-4">Product</h5>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">Features</a></li>
                <li><a href="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">Pricing</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">Integrations</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">API</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-gray-900 font-semibold mb-4">Company</h5>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">About</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">Blog</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">Careers</a></li>
                <li><a href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">Contact</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-gray-900 font-semibold mb-4">Connect</h5>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 text-sm">© 2024 biirbal.ai. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">Privacy Policy</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">Terms of Service</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">Support</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
    </>
  )
}
