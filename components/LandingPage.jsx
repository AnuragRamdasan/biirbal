'use client'

import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function LandingPage() {
  const { data: session } = useSession()

  return (
    <div className="relative min-h-screen">
      {/* Hero Section */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Turn Articles into Audio with AI
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Listen to your favorite articles, blogs, and documents. Save time by turning text into audio and consume content on the go.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              {session ? (
                <Button asChild size="lg">
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              ) : (
                <Button asChild size="lg">
                  <Link href="/login">Get Started</Link>
                </Button>
              )}
              <Button variant="outline" asChild size="lg">
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-primary">Features</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to stay informed
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <div className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.name} className="flex flex-col">
                  <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                    {feature.icon}
                  </div>
                  <div className="flex flex-auto flex-col">
                    <h3 className="text-lg font-semibold leading-8">{feature.name}</h3>
                    <p className="mt-1 flex flex-auto text-base leading-7 text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const features = [
  {
    name: 'AI-Powered Audio Conversion',
    description: 'Convert any article into natural-sounding audio using state-of-the-art AI voices.',
    icon: (
      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
  },
  {
    name: 'Slack Integration',
    description: 'Automatically convert articles shared in your Slack channels into audio format.',
    icon: (
      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    name: 'Listen Anywhere',
    description: 'Access your audio library from any device and listen to articles on the go.',
    icon: (
      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
] 