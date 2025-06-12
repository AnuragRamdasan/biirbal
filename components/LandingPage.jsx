'use client'

import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Play, Clock, Users, Zap, Headphones, BarChart3, Shield } from 'lucide-react'

export default function LandingPage() {
  const { data: session } = useSession()

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-orange-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-200/20 via-transparent to-orange-200/20 dark:from-blue-900/20 dark:to-orange-900/20" />
      
      {/* Hero Section */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-4xl py-32 sm:py-48 lg:py-56"
        >
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              <Badge variant="secondary" className="mb-6 px-4 py-2">
                🎉 Trusted by 10,000+ professionals
              </Badge>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-5xl font-bold tracking-tight sm:text-7xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-600 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent"
            >
              Turn Articles into Audio with AI
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="mt-8 text-xl leading-8 text-gray-600 dark:text-gray-300 max-w-3xl mx-auto"
            >
              Stop reading, start listening. Transform any article into high-quality audio instantly. 
              Perfect for busy professionals who want to consume content while commuting, exercising, or multitasking.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              {session ? (
                <Button asChild size="lg" className="gradient-bg text-white hover:opacity-90 transition-opacity px-8 py-4 text-lg">
                  <Link href="/dashboard">
                    <Play className="mr-2 h-5 w-5" />
                    Go to Dashboard
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="gradient-bg text-white hover:opacity-90 transition-opacity px-8 py-4 text-lg">
                  <Link href="/login">
                    <Zap className="mr-2 h-5 w-5" />
                    Start Free Trial
                  </Link>
                </Button>
              )}
              <Button variant="outline" asChild size="lg" className="px-8 py-4 text-lg border-2">
                <Link href="#demo">
                  <Play className="mr-2 h-5 w-5" />
                  Watch Demo
                </Link>
              </Button>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="mt-12 text-sm text-gray-500 dark:text-gray-400"
            >
              ✨ No credit card required • 🚀 Setup in 2 minutes • 🎧 Cancel anytime
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Social Proof */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.8 }}
        className="relative mx-auto max-w-7xl px-6 lg:px-8"
      >
        <div className="text-center">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-8">
            Trusted by teams at leading companies
          </p>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-6 items-center opacity-60">
            {companyLogos.map((company, index) => (
              <div key={index} className="flex justify-center">
                <div className="h-12 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{company}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Features Section */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="py-24 sm:py-32"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-600 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
              Everything you need to consume content smarter
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Built for modern professionals who want to maximize their learning while minimizing their screen time.
            </p>
          </div>
          
          <div className="mx-auto mt-20 max-w-5xl">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 + index * 0.1, duration: 0.6 }}
                >
                  <Card className="relative group hover:shadow-large transition-all duration-300">
                    <CardContent className="p-8">
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-bg group-hover:scale-110 transition-transform duration-300">
                          {feature.icon}
                        </div>
                        <h3 className="text-xl font-semibold">{feature.name}</h3>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 leading-7">
                        {feature.description}
                      </p>
                      {feature.metrics && (
                        <div className="mt-6 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          {feature.metrics.map((metric, i) => (
                            <div key={i} className="flex items-center space-x-1">
                              <metric.icon className="h-4 w-4" />
                              <span>{metric.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Testimonials Section */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="py-24 sm:py-32 bg-gray-50/50 dark:bg-slate-800/50"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Loved by thousands of professionals
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              See what our users are saying about Taansen.ai
            </p>
          </div>
          
          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.7 + index * 0.1, duration: 0.6 }}
              >
                <Card className="h-full">
                  <CardContent className="p-8">
                    <div className="flex items-center space-x-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="text-yellow-400">⭐</span>
                      ))}
                    </div>
                    <blockquote className="text-gray-700 dark:text-gray-300 mb-6">
                      "{testimonial.content}"
                    </blockquote>
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={testimonial.avatar} />
                        <AvatarFallback>{testimonial.author.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{testimonial.author}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* CTA Section */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 0.8 }}
        className="py-24 sm:py-32"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to transform how you consume content?
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
              Join thousands of professionals who have already made the switch to audio-first content consumption.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              {session ? (
                <Button asChild size="lg" className="gradient-bg text-white hover:opacity-90 transition-opacity px-8 py-4 text-lg">
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="gradient-bg text-white hover:opacity-90 transition-opacity px-8 py-4 text-lg">
                  <Link href="/login">Start Free Trial</Link>
                </Button>
              )}
              <Button variant="outline" asChild size="lg" className="px-8 py-4 text-lg">
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

const companyLogos = [
  "TechCorp", "InnovateLtd", "StartupXYZ", "Global Inc", "FutureCo", "ScaleUp"
]

const features = [
  {
    name: 'Lightning-Fast AI Conversion',
    description: 'Transform any article into studio-quality audio in under 30 seconds using our proprietary AI voices that sound completely natural.',
    icon: <Zap className="h-6 w-6 text-white" />,
    metrics: [
      { icon: Clock, value: "< 30 sec" },
      { icon: BarChart3, value: "99.9% uptime" }
    ]
  },
  {
    name: 'Seamless Slack Integration',
    description: 'Automatically process articles shared in your Slack channels. Your team gets instant audio versions without lifting a finger.',
    icon: <Users className="h-6 w-6 text-white" />,
    metrics: [
      { icon: Users, value: "Team-ready" },
      { icon: Shield, value: "Enterprise secure" }
    ]
  },
  {
    name: 'Listen Everywhere',
    description: 'Your audio library syncs across all devices. Listen during commutes, workouts, or while multitasking. Never miss important content again.',
    icon: <Headphones className="h-6 w-6 text-white" />,
    metrics: [
      { icon: Play, value: "Offline ready" },
      { icon: BarChart3, value: "Smart playlists" }
    ]
  },
]

const testimonials = [
  {
    content: "Taansen.ai has completely changed how I consume content. I listen to articles during my commute and feel so much more informed. The AI voices are incredibly natural!",
    author: "Sarah Chen",
    role: "Product Manager at TechCorp",
    avatar: null
  },
  {
    content: "Our entire team uses this for staying up-to-date with industry news. The Slack integration is seamless and saves us hours every week. Absolutely love it!",
    author: "Michael Rodriguez",
    role: "Engineering Lead at StartupXYZ",
    avatar: null
  },
  {
    content: "The quality is outstanding and the speed is incredible. I can now 'read' twice as many articles while exercising. This tool is a game-changer for busy professionals.",
    author: "Emily Johnson",
    role: "Marketing Director at Global Inc",
    avatar: null
  }
] 