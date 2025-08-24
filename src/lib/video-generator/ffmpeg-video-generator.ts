import { FFmpegVideoCreator } from './ffmpeg-video-creator';
import { generateAudioSummary } from '../text-to-speech';
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

export interface VideoResult {
  success: boolean;
  videoPath?: string;
  publicUrl?: string;
  audioUrl?: string;
  error?: string;
}

export async function createFFmpegVideoFromArticle(
  title: string,
  summary: string,
  keywords: string[],
  options: { duration: number }
): Promise<VideoResult> {
  const { duration } = options;
  const videoId = `ffmpeg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const workingDir = path.join(os.tmpdir(), videoId);
  
  try {
    // Create working directory
    await fs.mkdir(workingDir, { recursive: true });
    
    // Step 1: Generate TTS audio
    const audioResult = await generateAudioSummary(summary, title);
    const audioPath = path.join(workingDir, 'narration.mp3');
    await fs.writeFile(audioPath, audioResult.audioBuffer);
    
    // Step 2: Download Pexels videos
    const videoPaths: string[] = [];
    const targetVideoCount = 20; // Download more than 15 to have variety
    
    for (let i = 0; i < Math.min(keywords.length, targetVideoCount); i++) {
      const keyword = keywords[i];
      
      try {
        const videoUrl = await searchPexelsVideo(keyword);
        if (videoUrl) {
          const videoPath = path.join(workingDir, `clip_${i + 1}.mp4`);
          await downloadVideo(videoUrl, videoPath);
          videoPaths.push(videoPath);
          
          if (videoPaths.length >= targetVideoCount) break;
        }
      } catch (error) {
        console.error(`Failed to download video for keyword "${keyword}":`, error);
      }
    }
    
    // Fallback keywords if we don't have enough
    if (videoPaths.length < 15) {
      const fallbackKeywords = [
        'business', 'technology', 'nature', 'city', 'people', 
        'abstract', 'modern', 'urban', 'creative', 'innovation'
      ];
      
      for (const fallback of fallbackKeywords) {
        if (videoPaths.length >= targetVideoCount) break;
        
        try {
          const videoUrl = await searchPexelsVideo(fallback);
          if (videoUrl) {
            const videoPath = path.join(workingDir, `fallback_${videoPaths.length + 1}.mp4`);
            await downloadVideo(videoUrl, videoPath);
            videoPaths.push(videoPath);
          }
        } catch (error) {
          console.error(`Failed to download fallback video for "${fallback}":`, error);
        }
      }
    }
    
    if (videoPaths.length === 0) {
      throw new Error('No videos could be downloaded from Pexels');
    }
    
    // Step 3: Create video using FFmpeg
    const outputVideoPath = path.join(workingDir, 'final_video.mp4');
    const ffmpegCreator = new FFmpegVideoCreator();
    
    await ffmpegCreator.createTikTokVideo({
      title,
      summary,
      videoPaths,
      audioPath,
      duration,
      outputPath: outputVideoPath
    });
    
    // Step 4: Save to public directory for serving
    const publicVideoDir = path.join(process.cwd(), 'public', 'uploads', 'videos');
    await fs.mkdir(publicVideoDir, { recursive: true });
    
    const publicVideoPath = path.join(publicVideoDir, `${videoId}.mp4`);
    await fs.copyFile(outputVideoPath, publicVideoPath);
    
    const publicAudioDir = path.join(process.cwd(), 'public', 'uploads', 'audio');
    await fs.mkdir(publicAudioDir, { recursive: true });
    
    const publicAudioPath = path.join(publicAudioDir, `${videoId}_audio.mp3`);
    await fs.copyFile(audioPath, publicAudioPath);
    
    // URLs for serving
    const videoUrl = `/uploads/videos/${videoId}.mp4`;
    const audioUrl = `/uploads/audio/${videoId}_audio.mp3`;
    
    // Cleanup working directory
    await fs.rm(workingDir, { recursive: true, force: true });
    
    return {
      success: true,
      videoPath: publicVideoPath,
      publicUrl: videoUrl,
      audioUrl: audioUrl
    };
    
  } catch (error) {
    
    // Cleanup on error
    try {
      await fs.rm(workingDir, { recursive: true, force: true });
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function searchPexelsVideo(keyword: string): Promise<string | null> {
  try {
    const pexelsApiKey = process.env.PEXELS_API_KEY;
    if (!pexelsApiKey) {
      throw new Error('PEXELS_API_KEY environment variable is required');
    }

    const response = await axios.get('https://api.pexels.com/videos/search', {
      params: {
        query: keyword,
        per_page: 10,
        size: 'medium',
        orientation: 'portrait' // Prefer vertical videos for TikTok
      },
      headers: {
        'Authorization': pexelsApiKey
      },
      timeout: 15000
    });
    
    const videos = response.data.videos;
    if (!videos || videos.length === 0) {
      return null;
    }
    
    // Filter videos by duration and quality
    const suitableVideos = videos.filter((video: any) => {
      const duration = video.duration || 0;
      const hasGoodQuality = video.video_files.some((file: any) => 
        file.quality === 'hd' || file.quality === 'sd'
      );
      
      return duration >= 8 && hasGoodQuality;
    });
    
    const candidateVideos = suitableVideos.length > 0 ? suitableVideos : videos;
    const randomVideo = candidateVideos[Math.floor(Math.random() * candidateVideos.length)];
    
    // Prefer HD, then SD quality
    let videoFile = randomVideo.video_files.find((file: { quality: string }) => 
      file.quality === 'hd'
    );
    
    if (!videoFile) {
      videoFile = randomVideo.video_files.find((file: { quality: string }) => 
        file.quality === 'sd'
      );
    }
    
    if (!videoFile && randomVideo.video_files.length > 0) {
      videoFile = randomVideo.video_files[0];
    }
    
    return videoFile ? videoFile.link : null;
    
  } catch (error) {
    console.error(`Pexels API error for query "${keyword}":`, error);
    return null;
  }
}

async function downloadVideo(url: string, outputPath: string): Promise<void> {
  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 30000
  });
  
  const writer = require('fs').createWriteStream(outputPath);
  response.data.pipe(writer);
  
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}