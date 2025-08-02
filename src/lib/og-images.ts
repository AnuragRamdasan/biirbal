// Open Graph image configurations for different pages

export const ogImageConfig = {
  default: {
    url: '/og-image.png',
    width: 1200,
    height: 630,
    alt: 'Biirbal - AI-Powered Slack Content Intelligence'
  },
  
  pricing: {
    url: '/pricing-og.png',
    width: 1200,
    height: 630,
    alt: 'Biirbal Pricing Plans - Choose Your Perfect Plan'
  },
  
  contact: {
    url: '/contact-og.png',
    width: 1200,
    height: 630,
    alt: 'Contact Biirbal Support - Get Help with Your AI Slack Bot'
  },
  
  terms: {
    url: '/terms-og.png',
    width: 1200,
    height: 630,
    alt: 'Biirbal Terms of Service - Legal Terms and Conditions'
  },
  
  privacy: {
    url: '/privacy-og.png',
    width: 1200,
    height: 630,
    alt: 'Biirbal Privacy Policy - Data Protection and Privacy Practices'
  },
  
  success: {
    url: '/success-og.png',
    width: 1200,
    height: 630,
    alt: 'Welcome to Biirbal - Setup Complete!'
  }
}

// Generate OG image URL for specific page
export function getOgImageUrl(page: keyof typeof ogImageConfig): string {
  const baseUrl = 'https://www.biirbal.com'
  const config = ogImageConfig[page] || ogImageConfig.default
  return `${baseUrl}${config.url}`
}

// Generate complete OG image metadata
export function getOgImageMeta(page: keyof typeof ogImageConfig) {
  const baseUrl = 'https://www.biirbal.com'
  const config = ogImageConfig[page] || ogImageConfig.default
  
  return {
    url: `${baseUrl}${config.url}`,
    width: config.width,
    height: config.height,
    alt: config.alt,
    type: 'image/png'
  }
}

// Social media image dimensions
export const socialImageSizes = {
  og: { width: 1200, height: 630 }, // Open Graph
  twitter: { width: 1200, height: 630 }, // Twitter Card Large
  linkedin: { width: 1200, height: 627 }, // LinkedIn
  facebook: { width: 1200, height: 630 }, // Facebook
  instagram: { width: 1080, height: 1080 }, // Instagram Square
  pinterest: { width: 1000, height: 1500 } // Pinterest
}

// Generate social sharing URLs
export function generateSocialSharingUrls(config: {
  url: string
  title: string
  description: string
  image?: string
}) {
  const encodedUrl = encodeURIComponent(config.url)
  const encodedTitle = encodeURIComponent(config.title)
  const encodedDescription = encodeURIComponent(config.description)
  const encodedImage = config.image ? encodeURIComponent(config.image) : ''
  
  return {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}&via=biirbal`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&title=${encodedTitle}&summary=${encodedDescription}`,
    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    hackernews: `https://news.ycombinator.com/submitlink?u=${encodedUrl}&t=${encodedTitle}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`,
    copy: config.url
  }
}

// Image optimization for different contexts
export const imageOptimizationConfig = {
  hero: {
    sizes: '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px',
    priority: true,
    quality: 90
  },
  
  thumbnail: {
    sizes: '(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 300px',
    priority: false,
    quality: 80
  },
  
  avatar: {
    sizes: '64px',
    priority: false,
    quality: 85
  },
  
  logo: {
    sizes: '200px',
    priority: true,
    quality: 90
  },
  
  og: {
    sizes: '1200px',
    priority: false,
    quality: 95
  }
}