import OpenAI from 'openai'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

export interface AudioResult {
  audioBuffer: Buffer
  fileName: string
  publicUrl?: string
  ttsScript?: string
}

export async function generateAudioSummary(
  text: string, 
  title: string,
): Promise<AudioResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required')
  }

  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })

  const processedText = `Here's a summary of ${title}: ${text}`


  const response = await openai.audio.speech.create({
    model: 'tts-1',
    voice: 'nova',
    input: processedText,
    response_format: 'mp3',
    speed: 1.1
  })

  const arrayBuffer = await response.arrayBuffer()
  const audioBuffer = Buffer.from(arrayBuffer)
  const fileName = `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`


  return {
    audioBuffer,
    fileName,
    ttsScript: processedText
  }
}

export async function uploadAudioToStorage(
  audioBuffer: Buffer, 
  fileName: string
): Promise<string> {
  const bucketName = process.env.AWS_S3_BUCKET_NAME
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

  if (!bucketName || !accessKeyId || !secretAccessKey) {
    throw new Error('AWS S3 configuration required')
  }

  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  })


  const key = `audio/${fileName}`
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: audioBuffer,
    ContentType: 'audio/mpeg'
  })

  await s3Client.send(command)
  
  const region = process.env.AWS_REGION || 'us-east-1'
  const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`
  
  return publicUrl
}

// Additional functions expected by tests
export async function generateAudioFromText(text: string): Promise<{ audioUrl: string, duration: number }> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text content is required')
  }

  // Truncate very long text
  const truncatedText = text.length > 4000 ? text.substring(0, 4000) + '...' : text
  
  const audioResult = await generateAudioSummary(truncatedText, 'Content Summary')
  const audioUrl = await uploadAudioToStorage(audioResult.audioBuffer, audioResult.fileName)
  
  // Estimate duration based on text length (approximate: ~150 words per minute)
  const wordCount = truncatedText.split(/\s+/).length
  const estimatedDuration = Math.max(10, (wordCount / 150) * 60) // Minimum 10 seconds
  
  return {
    audioUrl,
    duration: estimatedDuration
  }
}

export async function uploadAudioToS3(audioBuffer: Buffer, fileName: string): Promise<string> {
  return uploadAudioToStorage(audioBuffer, fileName)
}

