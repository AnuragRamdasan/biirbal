import { useSession } from 'next-auth/react'
import { loadStripe } from '@stripe/stripe-js'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { motion } from 'framer-motion'
import { 
  Check, 
  Zap, 
  Users, 
  Headphones, 
  Shield, 
  Star,
  TrendingUp,
  Clock,
  Sparkles,
  Crown
} from 'lucide-react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    originalPrice: null,
    popular: false,
    description: 'Perfect for trying out Taansen.ai',
    features: [
      'Up to 5 articles/month',
      '1 Slack channel',
      'Standard AI voices',
      'Basic audio quality',
      'Email support'
    ],
    limitations: [
      'Limited article processing',
      'Single channel only',
      'No priority support'
    ],
    cta: 'Start Free',
    variant: 'outline'
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 29,
    originalPrice: 39,
    popular: true,
    description: 'Best for individuals and small teams',
    features: [
      'Up to 200 articles/month',
      '5 Slack channels',
      'Premium AI voices',
      'High-quality audio',
      'Priority email support',
      'Custom voice settings',
      'Download audio files',
      'Analytics dashboard'
    ],
    limitations: [],
    cta: 'Start Free Trial',
    variant: 'default'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    originalPrice: null,
    popular: false,
    description: 'For large teams and organizations',
    features: [
      'Unlimited articles',
      'Unlimited channels',
      'Custom AI voice training',
      'Ultra-high quality audio',
      '24/7 priority support',
      'Advanced analytics',
      'API access',
      'Custom integrations',
      'Team management',
      'SLA guarantee'
    ],
    limitations: [],
    cta: 'Contact Sales',
    variant: 'outline'
  }
]

const testimonials = [
  {
    content: "Taansen.ai has revolutionized how our team consumes industry content. The professional plan gives us exactly what we need.",
    author: "Sarah Johnson",
    role: "Head of Product",
    company: "TechCorp",
    avatar: null,
    plan: "Professional"
  },
  {
    content: "The Enterprise plan's unlimited articles and custom voice training are game-changers for our organization.",
    author: "Michael Chen",
    role: "VP Engineering",
    company: "InnovateXYZ",
    avatar: null,
    plan: "Enterprise"
  }
]

const faqs = [
  {
    question: "Can I change plans anytime?",
    answer: "Yes! You can upgrade, downgrade, or cancel your subscription at any time. Changes take effect at your next billing cycle."
  },
  {
    question: "What happens if I exceed my article limit?",
    answer: "You'll receive a notification when you're near your limit. You can either upgrade your plan or wait for the next billing cycle."
  },
  {
    question: "Do you offer refunds?",
    answer: "We offer a 30-day money-back guarantee for all paid plans. No questions asked."
  },
  {
    question: "Can I use custom voices?",
    answer: "Custom voice training is available on the Enterprise plan. Contact our sales team to learn more."
  }
]

export default function Subscription() {
  const [loading, setLoading] = useState(false)
  const [billingCycle, setBillingCycle] = useState('monthly')

  const handleSubscribe = async (priceId) => {
    setLoading(true)
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      })

      const { sessionId } = await response.json()
      const stripe = await stripePromise
      await stripe?.redirectToCheckout({ sessionId })
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-6 py-16">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <Badge variant="secondary" className="mb-4">
            💰 Simple, transparent pricing
          </Badge>
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Choose Your Perfect Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
            Start free, scale as you grow. All plans include our core features with no hidden fees.
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-3 mb-8">
            <span className={`text-sm ${billingCycle === 'monthly' ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className={`text-sm ${billingCycle === 'yearly' ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
              Yearly
            </span>
            <Badge variant="success" className="text-xs">
              Save 20%
            </Badge>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto mb-16"
        >
          {PLANS.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className={`relative ${plan.popular ? 'lg:scale-105 lg:-mt-4' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="gradient-bg text-white px-4 py-1">
                    <Crown className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <Card className={`h-full ${plan.popular ? 'border-primary shadow-large' : 'hover:shadow-medium'} transition-all duration-300`}>
                <CardHeader className="text-center pb-8">
                  <div className="mb-4">
                    {plan.name === 'Starter' && <Zap className="h-8 w-8 mx-auto text-gray-600" />}
                    {plan.name === 'Professional' && <Sparkles className="h-8 w-8 mx-auto text-primary" />}
                    {plan.name === 'Enterprise' && <Crown className="h-8 w-8 mx-auto text-yellow-500" />}
                  </div>
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-300 mt-2">
                    {plan.description}
                  </CardDescription>
                  
                  <div className="mt-6">
                    <div className="flex items-center justify-center space-x-2">
                      {plan.originalPrice && (
                        <span className="text-lg text-gray-400 line-through">
                          ${billingCycle === 'yearly' ? plan.originalPrice * 10 : plan.originalPrice}
                        </span>
                      )}
                      <span className="text-5xl font-bold">
                        ${billingCycle === 'yearly' ? Math.floor(plan.price * 10 * 0.8) : plan.price}
                      </span>
                      <span className="text-gray-500">
                        /{billingCycle === 'yearly' ? 'year' : 'month'}
                      </span>
                    </div>
                    {billingCycle === 'yearly' && plan.price > 0 && (
                      <p className="text-sm text-green-600 mt-2">
                        Save ${plan.price * 12 * 0.2}/year
                      </p>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start space-x-3">
                        <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    onClick={() => plan.id !== 'enterprise' ? handleSubscribe(plan.id) : null}
                    disabled={loading}
                    variant={plan.variant}
                    className={`w-full py-6 text-lg ${plan.popular ? 'gradient-bg text-white hover:opacity-90' : ''}`}
                  >
                    {loading ? (
                      <div className="flex items-center space-x-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Processing...</span>
                      </div>
                    ) : (
                      plan.cta
                    )}
                  </Button>
                  
                  {plan.name === 'Professional' && (
                    <p className="text-xs text-center text-gray-500 mt-3">
                      14-day free trial • No credit card required
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust Signals */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center mb-16"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center">
              <Shield className="h-8 w-8 text-green-500 mb-2" />
              <h3 className="font-semibold">30-Day Guarantee</h3>
              <p className="text-sm text-gray-500">Full money-back guarantee</p>
            </div>
            <div className="flex flex-col items-center">
              <Users className="h-8 w-8 text-blue-500 mb-2" />
              <h3 className="font-semibold">10,000+ Users</h3>
              <p className="text-sm text-gray-500">Trusted by professionals</p>
            </div>
            <div className="flex flex-col items-center">
              <TrendingUp className="h-8 w-8 text-purple-500 mb-2" />
              <h3 className="font-semibold">99.9% Uptime</h3>
              <p className="text-sm text-gray-500">Enterprise-grade reliability</p>
            </div>
            <div className="flex flex-col items-center">
              <Clock className="h-8 w-8 text-orange-500 mb-2" />
              <h3 className="font-semibold">24/7 Support</h3>
              <p className="text-sm text-gray-500">Always here to help</p>
            </div>
          </div>
        </motion.div>

        {/* Testimonials */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-center mb-12">
            What our customers say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className="p-8">
                  <div className="flex items-center space-x-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <blockquote className="text-gray-700 dark:text-gray-300 mb-6">
                    "{testimonial.content}"
                  </blockquote>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={testimonial.avatar} />
                        <AvatarFallback>
                          {testimonial.author.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{testimonial.author}</div>
                        <div className="text-sm text-gray-500">
                          {testimonial.role} at {testimonial.company}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline">{testimonial.plan}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* FAQ */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">{faq.question}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
