import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function summarizeText(text) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview", // Latest GPT-4 model
      messages: [
        {
          role: "system",
          content: `You are a professional article summarizer. Create summaries that:
          - Are between 150-225 words long (for 60-90 seconds of audio)
          - Maintain key information and main points
          - Use clear, audio-friendly language
          - Include proper punctuation for natural speech
          - Avoid abbreviations, symbols, or complex formatting
          - Use complete sentences and natural transitions`
        },
        {
          role: "user",
          content: `Please summarize this article in 150-225 words: ${text}`
        }
      ],
      max_tokens: 600,
      temperature: 0.7,
      response_format: { type: "text" }
    });

    const summary = response.choices[0].message.content;

    // Verify summary length
    const wordCount = summary.split(/\s+/).length;
    
    if (wordCount < 150) {
      // If summary is too short, try again with more detail
      return summarizeText(text + "\n\nPlease provide more detail in the summary.");
    }
    
    if (wordCount > 225) {
      // If summary is too long, truncate to nearest sentence around 225 words
      const sentences = summary.match(/[^.!?]+[.!?]+/g) || [];
      let truncatedSummary = '';
      let currentWordCount = 0;
      
      for (const sentence of sentences) {
        const sentenceWordCount = sentence.split(/\s+/).length;
        if (currentWordCount + sentenceWordCount > 225) break;
        truncatedSummary += sentence;
        currentWordCount += sentenceWordCount;
      }
      
      return truncatedSummary;
    }

    return summary;
  } catch (error) {
    console.error('Error summarizing text:', error);
    // If OpenAI error, try with a simpler prompt
    if (error.response?.status === 429 || error.response?.status === 500) {
      try {
        const fallbackResponse = await openai.chat.completions.create({
          model: "gpt-3.5-turbo", // Fallback to 3.5 if 4 fails
          messages: [
            {
              role: "system",
              content: "Summarize this article in 200 words."
            },
            {
              role: "user",
              content: text
            }
          ],
          max_tokens: 500,
          temperature: 0.7,
        });
        return fallbackResponse.choices[0].message.content;
      } catch (fallbackError) {
        console.error('Fallback summarization failed:', fallbackError);
        throw new Error('Failed to summarize text');
      }
    }
    throw new Error('Failed to summarize text');
  }
}

// Helper function to estimate audio duration (if needed)
function estimateAudioDuration(text) {
  const words = text.split(/\s+/).length;
  const wordsPerMinute = 150; // Average speaking rate
  return (words / wordsPerMinute) * 60; // Duration in seconds
}