'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { trackConversion, CONVERSION_EVENTS } from '@/lib/posthog-tracking'

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!sessionId) {
      setStatus('error')
      setMessage('No session ID provided')
      return
    }

    // Verify the checkout session
    fetch('/api/stripe/verify-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus('success')
          setMessage('Your subscription has been activated successfully!')
          
          // Track successful payment conversion
          trackConversion(CONVERSION_EVENTS.PAYMENT_SUCCESSFUL, {
            sessionId,
            plan: data.subscription?.plan || 'unknown',
            amount: data.subscription?.amount || 0,
          })
        } else {
          setStatus('error')
          setMessage(data.error || 'Failed to verify payment')
        }
      })
      .catch(error => {
        console.error('Error verifying session:', error)
        setStatus('error')
        setMessage('An error occurred while verifying your payment')
      })
  }, [sessionId])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Processing Your Payment
          </h1>
          <p className="text-gray-600">
            Please wait while we confirm your subscription...
          </p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Error
          </h1>
          <p className="text-gray-600 mb-6">
            {message}
          </p>
          <div className="space-y-3">
            <Link
              href="/pricing"
              className="w-full inline-block bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
            >
              Try Again
            </Link>
            <Link
              href="/contact"
              className="w-full inline-block bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h1>
        <p className="text-gray-600 mb-6">
          {message}
        </p>
        <div className="space-y-3">
          <Link
            href="/"
            className="w-full inline-block bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/team"
            className="w-full inline-block bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            Manage Team
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Loading...
          </h1>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}