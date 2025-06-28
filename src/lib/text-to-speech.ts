import OpenAI from 'openai'
import path from 'path'
import fs from 'fs/promises'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
})

export interface AudioResult {
  audioBuffer: Buffer
  fileName: string
  publicUrl?: string
}

export async function generateAudioSummary(
  text: string, 
  title: string,
  maxDurationSeconds: number = 90
): Promise<AudioResult> {
  const startTime = Date.now()
  const maxRetries = 3
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🎤 TTS attempt ${attempt}/${maxRetries} for: ${title.substring(0, 50)}...`)
      
      // Prepare text for TTS (limit length based on speaking rate)
      const wordsPerMinute = 150 // Average speaking rate  
      const maxWords = Math.floor((maxDurationSeconds / 60) * wordsPerMinute)
      const processedText = prepareTextForTTS(text, title, maxWords)

      console.log(`📝 Processing ${processedText.length} characters (${processedText.split(' ').length} words)`)

      // Generate audio using OpenAI TTS with timeout
      const ttsStartTime = Date.now()
      
      const response = await Promise.race([
        openai.audio.speech.create({
          model: 'tts-1', // Fast model for speed
          voice: 'nova', // Consistent voice
          input: processedText,
          response_format: 'mp3',
          speed: 1.1 // Slightly faster for efficiency
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('TTS timeout after 30 seconds')), 30000)
        )
      ])

      console.log(`🎵 TTS API call completed in ${Date.now() - ttsStartTime}ms`)

      // Convert response to buffer
      const bufferStartTime = Date.now()
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = Buffer.from(arrayBuffer)
      
      console.log(`💾 Buffer conversion completed in ${Date.now() - bufferStartTime}ms`)
      console.log(`📊 Audio buffer size: ${(audioBuffer.length / 1024).toFixed(1)} KB`)

      const fileName = `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`

      console.log(`✅ Audio generation successful in ${Date.now() - startTime}ms`)

      return {
        audioBuffer,
        fileName
      }
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(`Unknown error: ${error}`)
      
      console.error(`❌ TTS attempt ${attempt} failed:`, {
        error: lastError.message,
        title: title.substring(0, 50),
        attempt,
        elapsed: Date.now() - startTime
      })

      // Don't retry for certain errors
      if (lastError.message.includes('invalid') || 
          lastError.message.includes('quota') ||
          lastError.message.includes('authentication')) {
        break
      }

      // Exponential backoff for retries
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        console.log(`⏳ Retrying TTS in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  console.error(`💥 All TTS attempts failed for: ${title}`)
  throw new Error(`Audio generation failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`)
}

export async function uploadAudioToStorage(
  audioBuffer: Buffer, 
  fileName: string
): Promise<string> {
  try {
    const bucketName = process.env.AWS_S3_BUCKET_NAME
    if (!bucketName) {
      console.warn('AWS_S3_BUCKET_NAME not configured, falling back to local storage')
      return await saveAudioLocally(audioBuffer, fileName)
    }

    const key = `audio/${fileName}`
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: audioBuffer,
      ContentType: 'audio/mpeg',
      ACL: 'public-read'
    })

    await s3Client.send(command)
    
    // Return the public URL
    const region = process.env.AWS_REGION || 'us-east-1'
    return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`
    
  } catch (error) {
    console.error('S3 upload failed, falling back to local storage:', error)
    return await saveAudioLocally(audioBuffer, fileName)
  }
}

function prepareTextForTTS(text: string, title: string, maxWords: number): string {
  // Create introduction
  const intro = `Here's a summary of the article: ${title}.`
  
  // Clean and limit the main text
  let mainText = text
    .replace(/[^\w\s.,!?;:-]/g, '') // Remove special characters that might break TTS
    .replace(/\s+/g, ' ')
    .trim()

  // Split into words and limit
  const words = mainText.split(/\s+/)
  if (words.length > maxWords - 15) { // Reserve words for intro and outro
    mainText = words.slice(0, maxWords - 15).join(' ') + '.'
  }

  // Add conclusion
  const outro = 'This summary was generated by your Slack Link Bot.'

  return `${intro} ${mainText} ${outro}`
}

// Alternative: Save to local file system for development
export async function saveAudioLocally(
  audioBuffer: Buffer, 
  fileName: string
): Promise<string> {
  const publicDir = path.join(process.cwd(), 'public', 'audio')
  
  try {
    await fs.mkdir(publicDir, { recursive: true })
    const filePath = path.join(publicDir, fileName)
    await fs.writeFile(filePath, audioBuffer)
    
    return `/audio/${fileName}`
  } catch (error) {
    console.error('Local audio save failed:', error)
    throw new Error('Failed to save audio file locally')
  }
}