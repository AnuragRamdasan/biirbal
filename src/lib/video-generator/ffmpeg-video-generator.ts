import { FFmpegVideoCreator } from './ffmpeg-video-creator';
import { generateAudioSummary } from '../text-to-speech';
import { searchPexelsVideo } from '../pexels-api';
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

// Main function using pre-fetched contextual videos
export async function createFFmpegVideoFromUrls(
  title: string,
  summary: string,
  videoUrls: string[],
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
    
    // Step 2: Download contextually-selected videos
    const videoPaths: string[] = [];
    console.log(`📥 Downloading ${videoUrls.length} contextually-selected videos...`);
    
    for (let i = 0; i < videoUrls.length; i++) {
      const videoUrl = videoUrls[i];
      
      try {
        const videoPath = path.join(workingDir, `clip_${i + 1}.mp4`);
        await downloadVideo(videoUrl, videoPath);
        videoPaths.push(videoPath);
        console.log(`✅ Downloaded video ${i + 1}/${videoUrls.length}`);
        
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to download video ${i + 1}:`, error.message);
      }
    }
    
    // Fallback videos if we don't have enough contextual ones
    if (videoPaths.length < 15) {
      console.log(`⚠️ Only got ${videoPaths.length} contextual videos, adding fallback videos...`);
      
      const fallbackKeywords = [
        'business meeting', 'professional office', 'modern technology', 'urban city', 'serious discussion', 
        'news studio', 'corporate building', 'data visualization', 'creative workspace', 'innovation'
      ];
      
      for (const fallback of fallbackKeywords) {
        if (videoPaths.length >= 20) break; // Still allow up to 20 total videos
        
        try {
          const videoUrl = await searchPexelsVideo(fallback);
          if (videoUrl) {
            const videoPath = path.join(workingDir, `fallback_${videoPaths.length + 1}.mp4`);
            await downloadVideo(videoUrl, videoPath);
            videoPaths.push(videoPath);
            console.log(`✅ Added fallback video: ${fallback}`);
          }
        } catch (error) {
          console.error(`Failed to download fallback video for "${fallback}":`, error.message);
        }
        
        // Small delay for fallback searches too
        await new Promise(resolve => setTimeout(resolve, 200));
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

// Legacy function for backward compatibility
export async function createFFmpegVideoFromArticle(
  title: string,
  summary: string,
  keywords: string[],
  options: { duration: number }
): Promise<VideoResult> {
  // Use the intelligent search to get better video URLs
  const { searchContextualVideos } = require('./intelligent-pexels-search');
  const videoResults = await searchContextualVideos(title, summary, 15);
  const videoUrls = videoResults.map((result: any) => result.videoUrl);
  
  // Fallback to keyword-based search if contextual search fails
  if (videoUrls.length === 0) {
    console.log('⚠️ Contextual search failed, falling back to keyword search');
    // Convert keywords to video URLs using basic search
    for (const keyword of keywords.slice(0, 15)) {
      try {
        const videoUrl = await searchPexelsVideo(keyword);
        if (videoUrl) {
          videoUrls.push(videoUrl);
        }
      } catch (error) {
        console.error(`Failed to search for keyword "${keyword}":`, error.message);
      }
    }
  }
  
  // Use the main function with the fetched URLs
  return createFFmpegVideoFromUrls(title, summary, videoUrls, options);
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