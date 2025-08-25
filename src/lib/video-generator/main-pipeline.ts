import { extractContentFromUrl, summarizeForAudio } from '../content-extractor';
import { createFFmpegVideoFromArticle } from './ffmpeg-video-generator';
import { SocialMediaPoster, createSocialCaption, SocialPostResult } from './social-poster';
import { getDbClient } from '../db';
import * as path from 'path';

export interface PipelineResult {
  success: boolean;
  articleTitle: string;
  videoCreated: boolean;
  socialPosts: SocialPostResult[];
  error?: string;
}

export class VideoGenerationPipeline {
  private socialPoster: SocialMediaPoster;

  constructor() {
    this.socialPoster = new SocialMediaPoster();
  }

  async processRandomArticle(): Promise<PipelineResult> {
    console.log('🚀 Starting automated video generation pipeline...');

    try {
      // Step 1: Get random article URL
      const articleUrl = await this.getRandomNewsArticleUrl();
      console.log(`📰 Selected article: ${articleUrl}`);

      // Step 2: Extract content using ScrapingBee for reliable extraction
      const extractedContent = await extractContentFromUrl(articleUrl);
      console.log(`✅ Extracted: ${extractedContent.title}`);

      // Step 3: Create summary for video
      const videoSummary = await summarizeForAudio(extractedContent.text, 120, articleUrl);
      console.log(`📝 Created video summary (${videoSummary.length} chars)`);

      // Step 4: Extract keywords for video footage (used as fallback only)
      const keywords = await this.extractKeywords(extractedContent.title + ' ' + videoSummary);

      // Step 5: Generate video using intelligent contextual search with frame freezing fixes
      console.log('🎬 Creating video with ChatGPT-enhanced contextual video selection...');
      const videoResult = await createFFmpegVideoFromArticle(
        extractedContent.title,
        videoSummary,
        keywords,
        { duration: 55 } // 55 seconds for TikTok/Instagram
      );

      // Step 6: Create social media caption
      const socialCaption = createSocialCaption(extractedContent.title, videoSummary);

      // Step 7: Handle video output based on environment
      let socialResults: SocialPostResult[] = [];
      
      if (!videoResult.success) {
        throw new Error(`Video generation failed: ${videoResult.error}`);
      }
      
      if (process.env.NODE_ENV === 'development') {
        // In development: video already saved locally by FFmpeg generator
        console.log(`✅ Video saved locally: ${videoResult.videoPath}`);
        console.log(`🎵 Audio available at: ${videoResult.audioUrl}`);
        
        // Mock social results for development
        socialResults = [
          { platform: 'instagram', success: true, postId: 'dev-mock-instagram' },
          { platform: 'tiktok', success: true, postId: 'dev-mock-tiktok' }
        ];
      } else {
        // In production: read video file and post to social platforms
        console.log('📱 Posting to social media...');
        const fs = require('fs');
        const videoBuffer = await fs.promises.readFile(videoResult.videoPath);
        
        socialResults = await this.socialPoster.postToAllPlatforms(
          videoBuffer,
          socialCaption
        );
      }

      // Step 8: Log results
      await this.logPipelineResult({
        articleUrl,
        articleTitle: extractedContent.title,
        videoFileName: path.basename(videoResult.videoPath || ''),
        audioUrl: videoResult.audioUrl,
        socialResults,
        success: true
      });

      return {
        success: true,
        articleTitle: extractedContent.title,
        videoCreated: true,
        socialPosts: socialResults
      };

    } catch (error) {
      console.error('❌ Pipeline failed:', error);
      
      const errorResult: PipelineResult = {
        success: false,
        articleTitle: 'Unknown',
        videoCreated: false,
        socialPosts: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      await this.logPipelineResult({
        articleUrl: 'unknown',
        articleTitle: 'unknown',
        videoFileName: '',
        success: false,
        error: errorResult.error,
        socialResults: []
      });

      return errorResult;
    }
  }

  private async getRandomNewsArticleUrl(): Promise<string> {
    // RSS feeds for different news sources
    const rssSources = [
      'https://feeds.bbci.co.uk/news/rss.xml',
      'https://rss.cnn.com/rss/edition.rss',
      'https://feeds.washingtonpost.com/rss/world',
      'https://www.theguardian.com/world/rss',
      'https://feeds.reuters.com/reuters/topNews'
    ];

    const randomSource = rssSources[Math.floor(Math.random() * rssSources.length)];
    
    try {
      const axios = require('axios');
      const cheerio = require('cheerio');
      
      const response = await axios.get(randomSource, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; VideoBot/1.0)'
        }
      });
      
      const $ = cheerio.load(response.data, { xmlMode: true });
      const links: string[] = [];
      
      $('item link, entry link').each((_: any, element: any) => {
        const link = $(element).text() || $(element).attr('href');
        if (link) links.push(link);
      });
      
      if (links.length === 0) {
        throw new Error('No articles found in RSS feed');
      }
      
      // Return random article from first 10
      const randomIndex = Math.floor(Math.random() * Math.min(links.length, 10));
      return links[randomIndex];
      
    } catch (error) {
      console.error(`Error fetching from ${randomSource}:`, error);
      // Fallback to a reliable news source
      return 'https://www.bbc.com/news';
    }
  }

  private async extractKeywords(text: string): Promise<string[]> {
    // Enhanced keyword extraction with contextual mapping
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'is', 'are', 'was', 'were', 'be',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'this', 'that', 'these', 'those',
      'said', 'says', 'will', 'can', 'also', 'more', 'other', 'many', 'most',
      'some', 'time', 'very', 'when', 'much', 'new', 'now', 'way', 'may',
      'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'her',
      'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'old',
      'see', 'two', 'who', 'boy', 'did', 'number', 'no', 'way', 'could',
      'people', 'my', 'than', 'first', 'been', 'call', 'who', 'oil', 'sit',
      'now', 'find', 'long', 'down', 'day', 'did', 'get', 'come', 'made',
      'part'
    ]);

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word));

    // Get word frequency
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });

    // Sort by frequency and return top keywords
    const sortedWords = Array.from(wordCount.entries())
      .sort(([,a], [,b]) => b - a)
      .map(([word]) => word);

    // Enhanced keyword mapping for better visual relevance
    const keywordMappings = {
      // Technology
      'technology': ['technology', 'innovation', 'digital', 'computer'],
      'tech': ['technology', 'innovation', 'digital', 'computer'],
      'ai': ['artificial intelligence', 'robot', 'technology', 'future'],
      'artificial': ['artificial intelligence', 'robot', 'technology', 'future'],
      'intelligence': ['artificial intelligence', 'robot', 'technology', 'future'],
      'digital': ['technology', 'digital', 'computer', 'screen'],
      'computer': ['technology', 'computer', 'digital', 'office'],
      'internet': ['technology', 'computer', 'digital', 'network'],
      'software': ['technology', 'computer', 'programming', 'office'],
      'data': ['technology', 'analytics', 'computer', 'business'],
      
      // Business & Finance
      'business': ['business', 'office', 'meeting', 'corporate'],
      'company': ['business', 'office', 'corporate', 'building'],
      'market': ['business', 'finance', 'stock market', 'economy'],
      'economy': ['business', 'finance', 'city', 'economic'],
      'financial': ['business', 'finance', 'money', 'bank'],
      'money': ['finance', 'business', 'currency', 'bank'],
      'bank': ['finance', 'business', 'banking', 'money'],
      'investment': ['finance', 'business', 'money', 'stock'],
      'stock': ['finance', 'business', 'trading', 'market'],
      'trade': ['business', 'commerce', 'international', 'shipping'],
      'economic': ['business', 'finance', 'economy', 'market'],
      
      // Politics & Government
      'government': ['government', 'politics', 'building', 'official'],
      'political': ['politics', 'government', 'election', 'debate'],
      'politics': ['politics', 'government', 'election', 'debate'],
      'president': ['politics', 'government', 'leadership', 'official'],
      'election': ['politics', 'voting', 'democracy', 'campaign'],
      'congress': ['politics', 'government', 'building', 'meeting'],
      'senate': ['politics', 'government', 'building', 'meeting'],
      'policy': ['government', 'politics', 'official', 'meeting'],
      
      // Health & Medicine
      'health': ['health', 'medical', 'hospital', 'doctor'],
      'medical': ['medical', 'health', 'hospital', 'doctor'],
      'hospital': ['hospital', 'medical', 'health', 'emergency'],
      'doctor': ['doctor', 'medical', 'health', 'hospital'],
      'medicine': ['medical', 'health', 'pharmacy', 'science'],
      'vaccine': ['medical', 'health', 'science', 'laboratory'],
      'covid': ['medical', 'health', 'pandemic', 'mask'],
      'pandemic': ['medical', 'health', 'global', 'crisis'],
      'virus': ['medical', 'health', 'science', 'laboratory'],
      
      // Environment & Climate
      'climate': ['environment', 'nature', 'earth', 'weather'],
      'environment': ['nature', 'environment', 'green', 'forest'],
      'energy': ['renewable energy', 'solar', 'wind', 'power'],
      'renewable': ['renewable energy', 'solar', 'wind', 'green'],
      'solar': ['solar energy', 'renewable', 'environment', 'technology'],
      'wind': ['wind energy', 'renewable', 'turbine', 'nature'],
      'pollution': ['environment', 'industrial', 'smog', 'factory'],
      'carbon': ['environment', 'industrial', 'emissions', 'climate'],
      
      // International & Global
      'international': ['international', 'global', 'world', 'flags'],
      'global': ['global', 'international', 'world', 'earth'],
      'world': ['global', 'international', 'earth', 'map'],
      'china': ['china', 'asia', 'international', 'chinese'],
      'chinese': ['china', 'asia', 'international', 'culture'],
      'russia': ['russia', 'international', 'kremlin', 'moscow'],
      'ukraine': ['ukraine', 'international', 'conflict', 'european'],
      'europe': ['europe', 'international', 'european', 'union'],
      'european': ['europe', 'international', 'european union', 'flags'],
      
      // Social & Society
      'social': ['social', 'people', 'community', 'society'],
      'society': ['society', 'social', 'people', 'community'],
      'community': ['community', 'people', 'social', 'neighborhood'],
      'education': ['education', 'school', 'students', 'learning'],
      'school': ['education', 'school', 'students', 'classroom'],
      'students': ['education', 'school', 'young people', 'learning'],
      'university': ['education', 'university', 'students', 'campus'],
      
      // Transportation
      'transportation': ['transportation', 'traffic', 'vehicles', 'road'],
      'travel': ['travel', 'transportation', 'tourism', 'airplane'],
      'aviation': ['aviation', 'airplane', 'airport', 'flight'],
      'airlines': ['aviation', 'airplane', 'airport', 'travel'],
      'shipping': ['shipping', 'cargo', 'port', 'logistics'],
      'automotive': ['automotive', 'cars', 'manufacturing', 'industry'],
      
      // Science & Research
      'science': ['science', 'research', 'laboratory', 'discovery'],
      'research': ['research', 'science', 'laboratory', 'study'],
      'study': ['research', 'science', 'laboratory', 'academic'],
      'laboratory': ['laboratory', 'science', 'research', 'experiment'],
      'space': ['space', 'astronomy', 'rocket', 'satellite'],
      'nasa': ['space', 'rocket', 'astronomy', 'science']
    };

    // Map keywords to visual concepts
    const enhancedKeywords: string[] = [];
    const topKeywords = sortedWords.slice(0, 4);
    
    for (const keyword of topKeywords) {
      if (keywordMappings[keyword]) {
        enhancedKeywords.push(...keywordMappings[keyword]);
      } else {
        enhancedKeywords.push(keyword);
      }
    }
    
    // Add contextual fallbacks based on detected topics
    const textLower = text.toLowerCase();
    if (textLower.includes('election') || textLower.includes('vote') || textLower.includes('campaign')) {
      enhancedKeywords.push('politics', 'voting', 'democracy', 'government');
    } else if (textLower.includes('covid') || textLower.includes('pandemic') || textLower.includes('health')) {
      enhancedKeywords.push('medical', 'health', 'hospital', 'science');
    } else if (textLower.includes('climate') || textLower.includes('environment')) {
      enhancedKeywords.push('environment', 'nature', 'renewable energy', 'green');
    } else if (textLower.includes('economy') || textLower.includes('market') || textLower.includes('business')) {
      enhancedKeywords.push('business', 'finance', 'office', 'corporate');
    } else if (textLower.includes('war') || textLower.includes('conflict') || textLower.includes('military')) {
      enhancedKeywords.push('military', 'conflict', 'international', 'news');
    } else {
      // Generic high-quality fallbacks
      enhancedKeywords.push('business', 'technology', 'people', 'modern');
    }
    
    // Remove duplicates and return unique keywords
    return [...new Set(enhancedKeywords)].slice(0, 8);
  }

  private async logPipelineResult(result: {
    articleUrl: string;
    articleTitle: string;
    videoFileName: string;
    audioUrl?: string;
    success: boolean;
    error?: string;
    socialResults: SocialPostResult[];
  }): Promise<void> {
    try {
      // Log to database - you can create a new table for this
      console.log('📊 Pipeline Result:', {
        timestamp: new Date().toISOString(),
        article: result.articleTitle,
        success: result.success,
        instagramSuccess: result.socialResults.find(r => r.platform === 'instagram')?.success || false,
        tiktokSuccess: result.socialResults.find(r => r.platform === 'tiktok')?.success || false,
        error: result.error
      });
      
      // You could extend this to save to your database using existing models
      // await db.createVideoGenerationLog(result);
      
    } catch (error) {
      console.error('Failed to log pipeline result:', error);
    }
  }
}

// Main function to be called by Heroku scheduler
export async function runVideoGenerationJob(): Promise<PipelineResult> {
  const pipeline = new VideoGenerationPipeline();
  return await pipeline.processRandomArticle();
}