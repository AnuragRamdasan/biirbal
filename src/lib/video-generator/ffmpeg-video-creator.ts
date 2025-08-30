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
    
    // Step 1: Get actual audio duration for precise caption sync
    const actualAudioDuration = await this.getAudioDuration(audioPath);
    console.log(`🎵 Audio duration: ${actualAudioDuration.toFixed(2)}s (expected: ${duration}s)`);
    
    // Step 2: Create video segments (resize to 1080x1920 and trim)
    const processedClips = await this.processClips(targetClips, clipDuration);
    
    // Step 3: Concatenate video clips
    const concatenatedVideo = await this.concatenateVideos(processedClips, duration);
    
    // Step 4: Generate captions with precise timing using the actual spoken text
    const spokenText = `Here's a summary of ${title}: ${summary}`;
    const captionFile = await this.generateCaptions(spokenText, actualAudioDuration);
    
    // Step 5: Add captions and audio to create final video
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
      
      // FFmpeg command to resize to TikTok format, trim duration, and ensure consistent frame rate
      const args = [
        '-i', inputPath,
        '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
        '-t', duration.toString(),
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-r', '30',                  // Force consistent 30fps
        '-g', '90',                  // Set GOP size (3 seconds at 30fps)
        '-keyint_min', '30',         // Minimum keyframe interval
        '-pix_fmt', 'yuv420p',       // Ensure consistent pixel format
        '-an',                       // Remove audio (we'll add our own)
        '-y',                        // Overwrite
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
    
    // Concatenate videos with consistent encoding to prevent frame freezing
    const args = [
      '-f', 'concat',
      '-safe', '0',
      '-i', concatFile,
      '-t', totalDuration.toString(),
      // Force consistent encoding parameters
      '-c:v', 'libx264',           // Use H.264 codec
      '-preset', 'medium',         // Encoding speed vs quality balance
      '-crf', '23',                // Constant rate factor (quality)
      '-r', '30',                  // Force 30fps throughout
      '-g', '90',                  // Set GOP size (3 seconds at 30fps)
      '-keyint_min', '30',         // Minimum keyframe interval
      '-sc_threshold', '0',        // Disable scene change detection
      '-pix_fmt', 'yuv420p',       // Ensure consistent pixel format
      '-movflags', '+faststart',   // Enable fast start for web playback
      '-avoid_negative_ts', 'make_zero',  // Handle timestamp issues
      '-fflags', '+genpts',        // Generate presentation timestamps
      '-y',
      outputPath
    ];
    
    await this.runFFmpeg(args);
    await fs.unlink(concatFile);
    
    return outputPath;
  }
  
  private async generateCaptions(text: string, duration: number): Promise<string> {
    const captionFile = '/tmp/captions.ass';
    
    console.log(`🔤 Generating captions for text: "${text.substring(0, 50)}..." (${duration.toFixed(2)}s)`);
    
    // Calculate speech-based timing for better synchronization
    const words = text.split(' ').filter(word => word.trim().length > 0);
    const totalWords = words.length;
    
    // OpenAI TTS timing: ~2.8-3.2 words per second at normal speed
    // With 1.1x speed: ~3.1-3.5 words per second
    const baseWordsPerSecond = 3.2;
    const ttsSpeedMultiplier = 1.1;
    const adjustedWordsPerSecond = baseWordsPerSecond * ttsSpeedMultiplier;
    
    // Calculate expected vs actual duration ratio for scaling
    const expectedDuration = totalWords / adjustedWordsPerSecond;
    const durationRatio = duration / expectedDuration;
    
    console.log(`📊 Caption timing: ${totalWords} words, ${adjustedWordsPerSecond.toFixed(1)} wps, expected ${expectedDuration.toFixed(1)}s, actual ${duration.toFixed(1)}s, ratio ${durationRatio.toFixed(2)}`);
    
    // Group words into natural phrases for better readability
    const captions = this.createCaptionGroups(words);
    
    // Calculate timing with improved precision
    let currentTime = 0;
    const captionTimings: Array<{text: string, start: number, end: number}> = [];
    
    for (let i = 0; i < captions.length; i++) {
      const caption = captions[i];
      const captionWords = caption.split(' ').length;
      
      // Base duration from word count
      let baseDuration = captionWords / adjustedWordsPerSecond;
      
      // Add natural pauses for punctuation
      if (caption.match(/[.!?]$/)) {
        baseDuration += 0.4; // Longer pause for sentence endings
      } else if (caption.match(/[,:;]$/)) {
        baseDuration += 0.2; // Shorter pause for commas/semicolons
      }
      
      // Scale by actual vs expected duration
      const captionDuration = baseDuration * durationRatio;
      
      // Add slight overlap for smoother transitions
      const overlap = 0.1;
      const endTime = Math.min(currentTime + captionDuration + overlap, duration);
      
      captionTimings.push({
        text: caption.toUpperCase(),
        start: currentTime,
        end: endTime
      });
      
      console.log(`  Caption ${i + 1}: "${caption}" (${currentTime.toFixed(1)}s - ${endTime.toFixed(1)}s)`);
      
      currentTime += captionDuration;
      
      // Stop if we've reached the end of the audio
      if (currentTime >= duration - 0.5) { // Leave 0.5s buffer at end
        break;
      }
    }
    
    // ASS subtitle format with enhanced TikTok-style styling
    let assContent = `[Script Info]
Title: TikTok Style Captions
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: TikTok,Arial Black,28,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,4,2,2,30,30,50,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    for (const caption of captionTimings) {
      const startTimestamp = this.formatTimestamp(caption.start);
      const endTimestamp = this.formatTimestamp(caption.end);
      
      assContent += `Dialogue: 0,${startTimestamp},${endTimestamp},TikTok,,0,0,0,,${caption.text}\n`;
    }
    
    await fs.writeFile(captionFile, assContent);
    console.log(`✅ Generated ${captionTimings.length} caption segments`);
    return captionFile;
  }
  
  private createCaptionGroups(words: string[]): string[] {
    const captions: string[] = [];
    let currentCaption = '';
    let wordCount = 0;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const nextWord = words[i + 1];
      
      // Add current word to caption
      currentCaption += (currentCaption.length > 0 ? ' ' : '') + word;
      wordCount++;
      
      // Determine if we should break after this word
      const hasStrongPunctuation = word.match(/[.!?]$/);
      const hasWeakPunctuation = word.match(/[,:;]$/);
      const isLongEnough = wordCount >= 3;
      const isTooLong = wordCount >= 6 || currentCaption.length > 45;
      
      // Natural break points for TikTok captions
      const shouldBreak = isTooLong || 
                         (hasStrongPunctuation && isLongEnough) ||
                         (hasWeakPunctuation && wordCount >= 4) ||
                         (wordCount >= 4 && nextWord && this.isNaturalBreakWord(nextWord));
      
      if (shouldBreak || i === words.length - 1) {
        captions.push(currentCaption.trim());
        currentCaption = '';
        wordCount = 0;
      }
    }
    
    return captions.filter(caption => caption.length > 0);
  }
  
  private isNaturalBreakWord(word: string): boolean {
    // Words that naturally start new thoughts/sentences
    const breakWords = [
      'and', 'but', 'however', 'meanwhile', 'therefore', 'moreover',
      'furthermore', 'additionally', 'consequently', 'nevertheless',
      'the', 'this', 'that', 'these', 'those', 'here', 'there',
      'now', 'then', 'later', 'first', 'second', 'finally',
      'also', 'still', 'yet', 'so', 'because', 'since', 'while'
    ];
    
    return breakWords.includes(word.toLowerCase().replace(/[^\w]/g, ''));
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
      '-i', videoPath,             // Input video
      '-i', audioPath,             // Input audio
      '-vf', `ass=${captionFile}`, // Add captions
      // Maintain consistent encoding parameters
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-r', '30',                  // Maintain 30fps
      '-g', '90',                  // Maintain GOP size
      '-keyint_min', '30',         // Maintain keyframe interval
      '-pix_fmt', 'yuv420p',       // Maintain pixel format
      '-c:a', 'aac',
      '-b:a', '128k',
      '-map', '0:v',               // Use video from first input
      '-map', '1:a',               // Use audio from second input  
      '-shortest',                 // End when shortest stream ends
      '-avoid_negative_ts', 'make_zero',  // Handle timestamp issues
      '-fflags', '+genpts',        // Generate presentation timestamps
      '-y',                        // Overwrite output
      outputPath
    ];
    
    await this.runFFmpeg(args);
  }
  
  private async getAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      // Use ffprobe to get exact audio duration
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-show_entries', 'format=duration',
        '-of', 'csv=p=0',
        audioPath
      ]);
      
      let stdout = '';
      ffprobe.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      ffprobe.on('close', (code) => {
        if (code === 0) {
          const duration = parseFloat(stdout.trim());
          resolve(duration);
        } else {
          // Fallback: estimate based on file size (rough approximation)
          console.warn('Could not get audio duration, using estimation');
          resolve(60); // Default fallback
        }
      });
      
      ffprobe.on('error', (error) => {
        console.warn('FFprobe error, using estimation:', error.message);
        resolve(60); // Default fallback
      });
    });
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