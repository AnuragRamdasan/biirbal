import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateAudio(text) {
  try {
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: text,
    })

    const buffer = Buffer.from(await response.arrayBuffer())
    return buffer
  } catch (error) {
    console.error('Error generating audio:', error)
    throw new Error('Failed to generate audio')
  }
}
