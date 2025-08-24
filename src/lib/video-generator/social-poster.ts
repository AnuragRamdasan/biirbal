import axios from 'axios';
import FormData from 'form-data';

export interface SocialPostResult {
  platform: 'instagram' | 'tiktok';
  postId?: string;
  success: boolean;
  error?: string;
}

export class SocialMediaPoster {
  private instagramAccessToken: string;
  private instagramBusinessAccountId: string;
  private tiktokAccessToken: string;

  constructor() {
    this.instagramAccessToken = process.env.INSTAGRAM_ACCESS_TOKEN || '';
    this.instagramBusinessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '';
    this.tiktokAccessToken = process.env.TIKTOK_ACCESS_TOKEN || '';

    if (!this.instagramAccessToken || !this.instagramBusinessAccountId) {
      console.warn('Instagram credentials not configured');
    }

    if (!this.tiktokAccessToken) {
      console.warn('TikTok credentials not configured');
    }
  }

  async postToInstagram(videoBuffer: Buffer, caption: string): Promise<SocialPostResult> {
    if (!this.instagramAccessToken || !this.instagramBusinessAccountId) {
      return {
        platform: 'instagram',
        success: false,
        error: 'Instagram credentials not configured'
      };
    }

    try {
      // Step 1: Upload video to Instagram
      const uploadResponse = await this.uploadVideoToInstagram(videoBuffer);
      
      if (!uploadResponse.success || !uploadResponse.mediaId) {
        return {
          platform: 'instagram',
          success: false,
          error: uploadResponse.error || 'Video upload failed'
        };
      }

      // Step 2: Publish the media
      const publishResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${this.instagramBusinessAccountId}/media_publish`,
        {
          creation_id: uploadResponse.mediaId
        },
        {
          headers: {
            'Authorization': `Bearer ${this.instagramAccessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        platform: 'instagram',
        success: true,
        postId: publishResponse.data.id
      };

    } catch (error: any) {
      console.error('Instagram posting error:', error.response?.data || error.message);
      
      return {
        platform: 'instagram',
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  private async uploadVideoToInstagram(videoBuffer: Buffer): Promise<{success: boolean, mediaId?: string, error?: string}> {
    try {
      // For Instagram Reels, we need to upload video as media
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${this.instagramBusinessAccountId}/media`,
        {
          media_type: 'REELS',
          video_url: await this.uploadToTemporaryStorage(videoBuffer), // You'll need to implement this
        },
        {
          headers: {
            'Authorization': `Bearer ${this.instagramAccessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        mediaId: response.data.id
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  async postToTikTok(videoBuffer: Buffer, caption: string): Promise<SocialPostResult> {
    if (!this.tiktokAccessToken) {
      return {
        platform: 'tiktok',
        success: false,
        error: 'TikTok credentials not configured'
      };
    }

    try {
      // TikTok API requires multiple steps: initialize, upload, then publish
      
      // Step 1: Initialize upload
      const initResponse = await axios.post(
        'https://open-api.tiktok.com/share/video/upload/',
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.tiktokAccessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const uploadUrl = initResponse.data.data.upload_url;
      
      // Step 2: Upload video
      const formData = new FormData();
      formData.append('video', videoBuffer, {
        filename: 'video.mp4',
        contentType: 'video/mp4'
      });

      const uploadResponse = await axios.post(uploadUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.tiktokAccessToken}`
        }
      });

      // Step 3: Publish video
      const publishResponse = await axios.post(
        'https://open-api.tiktok.com/share/video/publish/',
        {
          post_info: {
            title: caption,
            privacy_level: 'MUTUAL_FOLLOW_FRIEND', // or 'PUBLIC_TO_EVERYONE'
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
            video_cover_timestamp_ms: 1000
          },
          source_info: {
            source: 'PULL_FROM_URL',
            video_url: uploadResponse.data.data.video_url
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.tiktokAccessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        platform: 'tiktok',
        success: true,
        postId: publishResponse.data.data.share_id
      };

    } catch (error: any) {
      console.error('TikTok posting error:', error.response?.data || error.message);
      
      return {
        platform: 'tiktok',
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async postToAllPlatforms(videoBuffer: Buffer, caption: string): Promise<SocialPostResult[]> {
    const results: SocialPostResult[] = [];

    // Post to Instagram
    try {
      const instagramResult = await this.postToInstagram(videoBuffer, caption);
      results.push(instagramResult);
    } catch (error) {
      results.push({
        platform: 'instagram',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Post to TikTok  
    try {
      const tiktokResult = await this.postToTikTok(videoBuffer, caption);
      results.push(tiktokResult);
    } catch (error) {
      results.push({
        platform: 'tiktok',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return results;
  }

  private async uploadToTemporaryStorage(videoBuffer: Buffer): Promise<string> {
    const fileName = `temp_video_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;
    
    // In development, save locally instead of S3
    if (process.env.NODE_ENV !== 'production') {
      const fs = require('fs');
      const path = require('path');
      
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'videos');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, videoBuffer);
      
      // Return local URL accessible via HTTP
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      return `${baseUrl}/uploads/videos/${fileName}`;
    }

    // Production: implement S3 upload (placeholder for now)
    throw new Error('Production video storage not implemented - needed for Instagram video uploads');
  }
}

export function createSocialCaption(title: string, summary: string): string {
  // Create an engaging caption for social media
  const hashtags = [
    '#AI', '#News', '#Summary', '#VideoSummary', '#TechNews',
    '#AutomatedContent', '#NewsDigest', '#QuickRead'
  ];

  const caption = `${title}

${summary.slice(0, 100)}...

${hashtags.slice(0, 5).join(' ')}`;

  return caption.slice(0, 2200); // Stay within platform limits
}