import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface FFmpegVideoParams {
  title: string;
  summary: string;
  videoPaths: string[];
  audioPath: string;
  duration: number;
  outputPath: string;
}

export class FFmpegVideoCreator {
  async createTikTokVideo(params: FFmpegVideoParams): Promise<string> {
    const { title, summary, videoPaths, audioPath, duration, outputPath } = params;
    
    // Use exactly 15 clips with 1/15th of audio duration each
    const clipCount = 15;
    const targetClips = this.prepareClips(videoPaths, clipCount);
    const clipDuration = duration / clipCount; // 1/15th of total duration
    
    // Step 1: Create video segments (resize to 1080x1920 and trim)
    const processedClips = await this.processClips(targetClips, clipDuration);
    
    // Step 2: Concatenate video clips
    const concatenatedVideo = await this.concatenateVideos(processedClips, duration);
    
    // Step 3: Generate captions
    const captionFile = await this.generateCaptions(summary, duration);
    
    // Step 4: Add captions and audio to create final video
    await this.createFinalVideo(concatenatedVideo, audioPath, captionFile, outputPath);
    
    // Cleanup temp files
    await this.cleanup([concatenatedVideo, captionFile, ...processedClips]);
    
    return outputPath;
  }
  
  private prepareClips(videoPaths: string[], count: number): string[] {
    const clips: string[] = [];
    for (let i = 0; i < count; i++) {
      // Cycle through available videos
      clips.push(videoPaths[i % videoPaths.length]);
    }
    return clips;
  }
  
  private async processClips(clipPaths: string[], duration: number): Promise<string[]> {
    const processedClips: string[] = [];
    
    for (let i = 0; i < clipPaths.length; i++) {
      const inputPath = clipPaths[i];
      const outputPath = `/tmp/clip_${i}_processed.mp4`;
      
      // FFmpeg command to resize to TikTok format and trim duration
      const args = [
        '-i', inputPath,
        '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
        '-t', duration.toString(),
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-an', // Remove audio (we'll add our own)
        '-y', // Overwrite
        outputPath
      ];
      
      await this.runFFmpeg(args);
      processedClips.push(outputPath);
    }
    
    return processedClips;
  }
  
  private async concatenateVideos(clipPaths: string[], totalDuration: number): Promise<string> {
    const outputPath = '/tmp/concatenated_video.mp4';
    
    // Create concat file
    const concatFile = '/tmp/concat_list.txt';
    const concatContent = clipPaths.map(path => `file '${path}'`).join('\n');
    await fs.writeFile(concatFile, concatContent);
    
    // Concatenate videos
    const args = [
      '-f', 'concat',
      '-safe', '0',
      '-i', concatFile,
      '-t', totalDuration.toString(),
      '-c', 'copy',
      '-y',
      outputPath
    ];
    
    await this.runFFmpeg(args);
    await fs.unlink(concatFile);
    
    return outputPath;
  }
  
  private async generateCaptions(text: string, duration: number): Promise<string> {
    const captionFile = '/tmp/captions.ass';
    
    // Split text into words for TikTok-style word-by-word captions
    const words = text.split(' ');
    const wordsPerCaption = 4; // Show 4 words at a time
    const captionDuration = duration / Math.ceil(words.length / wordsPerCaption);
    
    // ASS subtitle format for TikTok-style captions
    let assContent = `[Script Info]
Title: TikTok Style Captions
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: TikTok,Arial,16,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,3,3,2,50,50,80,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    for (let i = 0; i < Math.ceil(words.length / wordsPerCaption); i++) {
      const startTime = i * captionDuration;
      const endTime = Math.min((i + 1) * captionDuration, duration);
      const captionWords = words.slice(i * wordsPerCaption, (i + 1) * wordsPerCaption);
      const captionText = captionWords.join(' ').toUpperCase();
      
      const startTimestamp = this.formatTimestamp(startTime);
      const endTimestamp = this.formatTimestamp(endTime);
      
      assContent += `Dialogue: 0,${startTimestamp},${endTimestamp},TikTok,,0,0,0,,${captionText}\n`;
    }
    
    await fs.writeFile(captionFile, assContent);
    return captionFile;
  }
  
  private formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const centiseconds = Math.floor((seconds % 1) * 100);
    
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }
  
  private async createFinalVideo(videoPath: string, audioPath: string, captionFile: string, outputPath: string): Promise<void> {
    const args = [
      '-i', videoPath,        // Input video
      '-i', audioPath,        // Input audio
      '-vf', `ass=${captionFile}`, // Add captions
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-map', '0:v',          // Use video from first input
      '-map', '1:a',          // Use audio from second input  
      '-shortest',            // End when shortest stream ends
      '-y',                   // Overwrite output
      outputPath
    ];
    
    await this.runFFmpeg(args);
  }
  
  private async runFFmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', args);
      
      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
        }
      });
      
      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg error: ${error.message}`));
      });
    });
  }
  
  private async cleanup(files: string[]): Promise<void> {
    for (const file of files) {
      try {
        await fs.unlink(file);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
}