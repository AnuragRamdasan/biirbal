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
  maxDurationSeconds: number = 59
): Promise<AudioResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required')
  }

  console.log(`🎤 Generating audio for: ${title.substring(0, 50)}...`)
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })

  const wordsPerMinute = 150
  const maxWords = Math.floor((maxDurationSeconds / 60) * wordsPerMinute)
  const processedText = `Here's a summary of ${title}: ${text}`

  console.log(`📝 Converting ${processedText.split(' ').length} words to speech`)

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

  console.log(`✅ Generated ${(audioBuffer.length / 1024).toFixed(1)}KB audio file`)

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

  console.log(`☁️ Uploading ${fileName} to S3`)

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
  
  console.log(`✅ Audio uploaded: ${publicUrl}`)
  return publicUrl
}

