import { generateAudioFromText, uploadAudioToS3 } from '@/lib/text-to-speech'

describe('Text-to-Speech', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateAudioFromText', () => {
    it('should generate audio from text successfully', async () => {
      const result = await generateAudioFromText('Test content for audio generation')
      
      expect(result.audioUrl).toMatch(/^https:\/\/test-bucket\.s3\.us-east-1\.amazonaws\.com\/audio\/audio_\d+_\w+\.mp3$/)
      expect(result.duration).toBeGreaterThan(0)
    })

    it('should handle OpenAI API errors', async () => {
      global.mockOpenAIInstance.audio.speech.create.mockRejectedValueOnce(new Error('OpenAI API error'))

      await expect(generateAudioFromText('Test content')).rejects.toThrow('OpenAI API error')
    })

    it('should handle empty text input', async () => {
      await expect(generateAudioFromText('')).rejects.toThrow('Text content is required')
    })

    it('should handle very long text by truncating', async () => {
      const longText = 'a'.repeat(5000) // Very long text
      const result = await generateAudioFromText(longText)
      
      expect(result.audioUrl).toMatch(/^https:\/\/test-bucket\.s3\.us-east-1\.amazonaws\.com\/audio\/audio_\d+_\w+\.mp3$/)
      expect(result.duration).toBeGreaterThan(0)
    })
  })

  describe('uploadAudioToS3', () => {
    it('should upload audio buffer to S3 successfully', async () => {
      const audioBuffer = Buffer.from('fake audio data')
      const result = await uploadAudioToS3(audioBuffer, 'test-file.mp3')
      
      expect(result).toBe('https://test-bucket.s3.us-east-1.amazonaws.com/audio/test-file.mp3')
    })

    it('should handle S3 upload errors', async () => {
      global.mockS3Instance.send.mockRejectedValueOnce(new Error('S3 upload failed'))

      const audioBuffer = Buffer.from('fake audio data')
      await expect(uploadAudioToS3(audioBuffer, 'test-file.mp3')).rejects.toThrow('S3 upload failed')
    })

    it('should generate consistent URLs for same filename', async () => {
      const audioBuffer = Buffer.from('fake audio data')
      const result1 = await uploadAudioToS3(audioBuffer, 'test.mp3')
      const result2 = await uploadAudioToS3(audioBuffer, 'test.mp3')
      
      expect(result1).toBe('https://test-bucket.s3.us-east-1.amazonaws.com/audio/test.mp3')
      expect(result2).toBe('https://test-bucket.s3.us-east-1.amazonaws.com/audio/test.mp3')
      expect(result1).toBe(result2) // Same filename should produce same URL
    })
  })
})