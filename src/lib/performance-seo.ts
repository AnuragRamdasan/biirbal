// Performance optimization configurations for SEO

export const performanceConfig = {
  // Critical resource hints
  preconnect: [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://api.openai.com'
  ],
  
  dnsPrefetch: [
    'https://slack.com',
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://js.stripe.com'
  ],
  
  // Resource preloading
  preload: [
    { href: '/logo.png', as: 'image', type: 'image/png' },
    { href: '/inter-font.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' }
  ],
  
  // Page prefetching for likely navigation
  prefetch: [
    '/pricing',
    '/contact',
    '/dashboard'
  ],
  
  // Critical CSS
  criticalCSS: `
    /* Critical above-the-fold styles */
    .hero-section {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 60vh;
    }
    
    .loading-skeleton {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      animation: loading 1.5s infinite;
    }
    
    @keyframes loading {
      0% { background-position: -200px 0; }
      100% { background-position: calc(200px + 100%) 0; }
    }
  `
}

// Generate performance hints for Next.js Head component
export function generatePerformanceHints() {
  return {
    preconnect: performanceConfig.preconnect,
    dnsPrefetch: performanceConfig.dnsPrefetch,
    preload: performanceConfig.preload,
    prefetch: performanceConfig.prefetch
  }
}

// Core Web Vitals optimization
export const coreWebVitalsConfig = {
  // Largest Contentful Paint (LCP)
  lcp: {
    targetMs: 2500,
    optimizations: [
      'Preload hero images',
      'Optimize font loading',
      'Reduce server response time',
      'Minimize main thread blocking'
    ]
  },
  
  // First Input Delay (FID)
  fid: {
    targetMs: 100,
    optimizations: [
      'Code splitting',
      'Lazy load non-critical JS',
      'Minimize JavaScript execution time',
      'Use web workers for heavy computations'
    ]
  },
  
  // Cumulative Layout Shift (CLS)
  cls: {
    targetScore: 0.1,
    optimizations: [
      'Set explicit dimensions for images',
      'Reserve space for ads and embeds',
      'Avoid inserting content above existing content',
      'Use transform animations instead of layout-inducing properties'
    ]
  },
  
  // First Contentful Paint (FCP)
  fcp: {
    targetMs: 1800,
    optimizations: [
      'Optimize server response time',
      'Eliminate render-blocking resources',
      'Minify CSS and JavaScript',
      'Remove unused CSS'
    ]
  }
}

// Image optimization settings
export const imageOptimization = {
  formats: ['webp', 'avif', 'png', 'jpg'],
  sizes: {
    hero: { width: 1200, height: 630 },
    thumbnail: { width: 300, height: 200 },
    avatar: { width: 64, height: 64 },
    logo: { width: 200, height: 50 }
  },
  quality: {
    high: 90,
    medium: 80,
    low: 70
  },
  loading: {
    critical: 'eager',
    normal: 'lazy'
  }
}

// Bundle optimization
export const bundleOptimization = {
  splitChunks: {
    vendor: ['react', 'react-dom', 'antd'],
    analytics: ['@google/analytics', 'hotjar'],
    utils: ['lodash', 'date-fns', 'uuid']
  },
  
  lazyLoad: [
    'dashboard',
    'team-management',
    'pricing-calculator',
    'analytics-charts'
  ],
  
  preload: [
    'auth-components',
    'layout-components',
    'navigation'
  ]
}

// Service Worker configuration for caching
export const serviceWorkerConfig = {
  cacheFirst: [
    '/static/',
    '/images/',
    '/fonts/',
    '/_next/static/'
  ],
  
  networkFirst: [
    '/api/',
    '/auth/'
  ],
  
  staleWhileRevalidate: [
    '/pricing',
    '/contact',
    '/terms',
    '/privacy'
  ],
  
  cacheOnly: [
    '/offline.html'
  ]
}

// Performance monitoring
export function trackCoreWebVitals(metric: any) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction: true,
      custom_map: {
        metric_value: metric.value,
        metric_delta: metric.delta,
        metric_id: metric.id,
        metric_entries: metric.entries?.length || 0
      }
    })
  }
  
  // Send to analytics endpoint
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        id: metric.id,
        timestamp: Date.now(),
        url: window.location.href
      })
    }).catch(console.error)
  }
}