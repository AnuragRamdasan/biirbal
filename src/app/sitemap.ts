import { MetadataRoute } from 'next'
import { getBaseUrl } from '@/lib/config'
import path from 'path'
import fs from 'fs'

// Function to get all blog posts dynamically
async function getBlogPosts(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl()
  const blogPosts: MetadataRoute.Sitemap = []

  try {
    // Get all blog post directories
    const blogDir = path.join(process.cwd(), 'src/app/blog')
    
    if (fs.existsSync(blogDir)) {
      const entries = fs.readdirSync(blogDir, { withFileTypes: true })
      
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== 'page.tsx' && entry.name !== 'layout.tsx') {
          const postPath = path.join(blogDir, entry.name)
          const pageFile = path.join(postPath, 'page.tsx')
          
          if (fs.existsSync(pageFile)) {
            const stats = fs.statSync(pageFile)
            blogPosts.push({
              url: `${baseUrl}/blog/${entry.name}`,
              lastModified: stats.mtime,
              changeFrequency: 'weekly',
              priority: 0.8,
            })
          }
        }
      }
    }
  } catch (error) {
    console.warn('Failed to read blog posts for sitemap:', error)
  }

  return blogPosts
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl()
  
  // Static pages with SEO-optimized priorities and frequencies
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/auth/signin`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/success`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
  ]

  // Get dynamic blog posts
  const blogPosts = await getBlogPosts()

  return [...staticPages, ...blogPosts]
}