// Additional structured data schemas for enhanced SEO

export const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How does biirbal.ai work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "biirbal.ai automatically detects links shared in your Slack channels, extracts the content using AI, and generates a 90-second audio summary that's posted as a thread reply. No manual intervention required."
      }
    },
    {
      "@type": "Question", 
      "name": "What types of content can biirbal.ai summarize?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "biirbal.ai can summarize articles, blog posts, news stories, documentation, research papers, and most web-based text content. It filters out media files and social media posts automatically."
      }
    },
    {
      "@type": "Question",
      "name": "How long are the audio summaries?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Audio summaries are optimized to be approximately 90 seconds long, perfect for listening during commutes or quick breaks while maintaining all key insights."
      }
    },
    {
      "@type": "Question",
      "name": "Is there a free trial?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes! We offer a 7-day free trial with 50 link summaries included. No credit card required to start."
      }
    },
    {
      "@type": "Question",
      "name": "Can I cancel my subscription anytime?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Absolutely. You can cancel your subscription at any time through the billing portal. There are no long-term contracts or cancellation fees."
      }
    },
    {
      "@type": "Question",
      "name": "How accurate are the AI summaries?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Our AI uses advanced natural language processing to extract key insights with high accuracy. The summaries focus on main points, key findings, and actionable information from the original content."
      }
    },
    {
      "@type": "Question",
      "name": "Which Slack channels does biirbal.ai monitor?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "biirbal.ai only monitors channels where the bot has been explicitly added. You have full control over which channels include the bot."
      }
    },
    {
      "@type": "Question",
      "name": "Is my data secure?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. We use enterprise-grade security, encrypt all data in transit and at rest, and follow SOC 2 compliance standards. We never store sensitive content longer than necessary for processing."
      }
    }
  ]
}

export const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Set Up biirbal.ai for Your Slack Team",
  "description": "Step-by-step guide to install and configure biirbal.ai for automatic link summarization in Slack",
  "image": "https://biirbal.ai/how-to-setup.png",
  "totalTime": "PT5M",
  "estimatedCost": {
    "@type": "MonetaryAmount",
    "currency": "USD",
    "value": "0"
  },
  "supply": [
    {
      "@type": "HowToSupply",
      "name": "Slack workspace with admin access"
    }
  ],
  "tool": [
    {
      "@type": "HowToTool",
      "name": "Web browser"
    }
  ],
  "step": [
    {
      "@type": "HowToStep",
      "name": "Visit biirbal.ai",
      "text": "Go to biirbal.ai and click 'Start Free Trial'",
      "image": "https://biirbal.ai/step1.png",
      "url": "https://biirbal.ai/step1"
    },
    {
      "@type": "HowToStep", 
      "name": "Authorize Slack Integration",
      "text": "Click 'Add to Slack' and authorize the bot permissions for your workspace",
      "image": "https://biirbal.ai/step2.png",
      "url": "https://biirbal.ai/step2"
    },
    {
      "@type": "HowToStep",
      "name": "Add Bot to Channels",
      "text": "Invite @biirbal to the Slack channels where you want link summarization",
      "image": "https://biirbal.ai/step3.png",
      "url": "https://biirbal.ai/step3"
    },
    {
      "@type": "HowToStep",
      "name": "Share Your First Link",
      "text": "Share any article or blog post link in a monitored channel to see biirbal.ai in action",
      "image": "https://biirbal.ai/step4.png",
      "url": "https://biirbal.ai/step4"
    }
  ]
}

export const breadcrumbSchema = (items: Array<{name: string, url: string}>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": item.url
  }))
})

export const reviewSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "biirbal.ai",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "250",
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
      "datePublished": "2024-01-15",
      "reviewBody": "Game changer! Our team used to miss 70% of shared articles. Now we consume everything through audio summaries during commutes. The AI quality is impressive and saves us hours weekly.",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": "5",
        "bestRating": "5",
        "worstRating": "1"
      }
    },
    {
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": "Marcus Rodriguez"
      },
      "datePublished": "2024-01-10", 
      "reviewBody": "Saved us 3+ hours weekly. Instead of bookmarking articles we never read, we listen to summaries instantly. Perfect for our distributed team across timezones.",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": "5",
        "bestRating": "5",
        "worstRating": "1"
      }
    },
    {
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": "Alex Thompson"
      },
      "datePublished": "2024-01-05",
      "reviewBody": "Perfect for our remote team. Everyone stays informed regardless of timezone. Audio summaries are incredibly well-made and capture the essence of long articles perfectly.",
      "reviewRating": {
        "@type": "Rating", 
        "ratingValue": "5",
        "bestRating": "5",
        "worstRating": "1"
      }
    }
  ]
}