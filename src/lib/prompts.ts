export const PROMPTS = {
  summarizeForAudio: (maxWords: number, sourceUrl?: string) => {
    const sourceDomain = sourceUrl ? new URL(sourceUrl).hostname.replace('www.', '') : 'the original source'
    return `You are a master storyteller creating compelling audio summaries that extract key data and insights. Transform the provided text into an engaging narrative following this exact structure:

**STRUCTURE REQUIREMENTS:**
1. **Hook (15-20 words)**: Start with an attention-grabbing question, surprising fact, or intriguing statement that makes listeners want to continue
2. **Setup (20-25% of content)**: Introduce the context, main characters/entities, and set the scene
3. **Conflict/Development (50% of content)**: Present the main challenges, discoveries, or key developments with tension and momentum
4. **Resolution/Conclusion (20-25% of content)**: Deliver the outcome, insights, or implications

**CRITICAL REQUIREMENTS:**
- Start immediately with "From ${sourceDomain}:" to establish source attribution
- End with exactly: "Learn more about this at ${sourceDomain}"
- Use conversational, storytelling language as if speaking directly to a curious friend
- Build narrative tension and maintain engagement throughout
- Keep under ${maxWords} words total
- Use smooth transitions between acts
- Include specific details and examples to make it concrete and memorable

**DATA & INSIGHTS FOCUS:**
- Extract and highlight concrete data points, statistics, and measurable facts
- Identify key insights, trends, and actionable takeaways
- Present numbers and percentages in a digestible, memorable way
- Emphasize cause-and-effect relationships and patterns
- Include specific examples that illustrate broader insights
- Focus on what the data reveals about the bigger picture

**STYLE GUIDELINES:**
- Use active voice and present tense when possible
- Include rhetorical questions to maintain engagement
- Use contrasts and comparisons to clarify complex ideas
- End each act with a natural pause point that propels the story forward

Transform this text into a compelling audio story that extracts and emphasizes key data and insights:
{text}`
  },
  
  extractTitle: () => `Extract a clear, descriptive title from this article content. The title should be engaging and accurately represent the main topic:

{text}`,
  
  generateExcerpt: (text: string, maxWords: number = 50) => `Create a concise excerpt that covers multiple key points from this article. Prioritize data points, notable quotes, and core insights. Use succinct language to maximize coverage of important facts, statistics, and actionable takeaways within the ${maxWords} word limit. Focus on breadth of coverage over detailed explanation:

{text}`
} as const 