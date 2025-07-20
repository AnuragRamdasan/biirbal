interface PodcastItem {
  id: string
  title: string
  description: string
  audioUrl: string
  originalUrl: string
  pubDate: Date
  imageUrl?: string | null
}

interface PodcastFeedOptions {
  title: string
  description: string
  teamId: string
  items: PodcastItem[]
}

export function generateRSSFeed(options: PodcastFeedOptions): string {
  const { title, description, teamId, items } = options
  
  const baseUrl = process.env.NEXTAUTH_URL || 'https://biirbal.ai'
  const podcastImageUrl = `${baseUrl}/logo.png`
  
  // Escape XML characters
  const escapeXml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }
  
  // Format date for RSS
  const formatRSSDate = (date: Date): string => {
    return date.toUTCString()
  }
  
  // Generate RSS items
  const rssItems = items.map(item => {
    const itemTitle = escapeXml(item.title)
    const itemDescription = escapeXml(item.description)
    const itemUrl = escapeXml(item.originalUrl)
    const audioUrl = escapeXml(item.audioUrl)
    const pubDate = formatRSSDate(item.pubDate)
    const guid = `${baseUrl}/dashboard?link=${item.id}`
    
    return `
    <item>
      <title>${itemTitle}</title>
      <description>${itemDescription}</description>
      <link>${itemUrl}</link>
      <guid isPermaLink="false">${guid}</guid>
      <pubDate>${pubDate}</pubDate>
      <enclosure url="${audioUrl}" type="audio/mpeg" length="0"/>
      ${item.imageUrl ? `<itunes:image href="${escapeXml(item.imageUrl)}"/>` : ''}
      <itunes:author>Biirbal</itunes:author>
      <itunes:subtitle>${itemDescription.substring(0, 100)}...</itunes:subtitle>
      <itunes:summary>${itemDescription}</itunes:summary>
      <itunes:duration>00:01:00</itunes:duration>
      <itunes:keywords>summary, article, content, news</itunes:keywords>
    </item>`
  }).join('')
  
  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(title)}</title>
    <description>${escapeXml(description)}</description>
    <link>${baseUrl}</link>
    <language>en-us</language>
    <copyright>© ${new Date().getFullYear()} Biirbal</copyright>
    <lastBuildDate>${formatRSSDate(new Date())}</lastBuildDate>
    <pubDate>${formatRSSDate(new Date())}</pubDate>
    <docs>https://validator.w3.org/feed/docs/rss2.html</docs>
    <generator>Biirbal Podcast Feed</generator>
    <managingEditor>hello@biirbal.ai (Biirbal)</managingEditor>
    <webMaster>hello@biirbal.ai (Biirbal)</webMaster>
    <image>
      <url>${podcastImageUrl}</url>
      <title>${escapeXml(title)}</title>
      <link>${baseUrl}</link>
      <width>1400</width>
      <height>1400</height>
    </image>
    
    <!-- iTunes-specific tags -->
    <itunes:author>Biirbal</itunes:author>
    <itunes:summary>${escapeXml(description)}</itunes:summary>
    <itunes:owner>
      <itunes:name>Biirbal</itunes:name>
      <itunes:email>hello@biirbal.ai</itunes:email>
    </itunes:owner>
    <itunes:image href="${podcastImageUrl}"/>
    <itunes:category text="Technology">
      <itunes:category text="Software How-To"/>
    </itunes:category>
    <itunes:category text="Business">
      <itunes:category text="News"/>
    </itunes:category>
    <itunes:explicit>false</itunes:explicit>
    <itunes:type>episodic</itunes:type>
    
    ${rssItems}
  </channel>
</rss>`
  
  return rssXml
}

export function generatePodcastToken(teamId: string): string {
  // Generate a secure token for podcast feed access
  // In production, you might want to use a more sophisticated token system
  const timestamp = Date.now().toString()
  const randomPart = Math.random().toString(36).substring(2, 15)
  const teamPart = teamId.substring(0, 8)
  
  return `${teamPart}-${timestamp}-${randomPart}`.substring(0, 32)
}