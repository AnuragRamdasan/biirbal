import OpenAI from 'openai';
import { searchPexelsVideo } from '../pexels-api';

export interface ContextualVideoSearch {
  title: string;
  summary: string;
  targetVideoCount: number;
}

export interface VideoSearchResult {
  keyword: string;
  videoUrl: string;
  relevanceScore: number;
}

/**
 * Generate intelligent, context-aware Pexels search terms using ChatGPT
 */
export async function generateContextualSearchTerms(
  title: string, 
  summary: string, 
  targetCount: number = 15
): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for intelligent video search');
  }

  console.log('🧠 Generating intelligent search terms with ChatGPT...');
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const prompt = `Analyze this news article and generate ${targetCount} highly relevant Pexels video search terms for creating a compelling news video.

ARTICLE TITLE: ${title}

ARTICLE SUMMARY: ${summary}

Consider these aspects when creating search terms:
1. GENRE: News type (politics, business, tech, health, sports, etc.)
2. REGION: Geographic context (if applicable)
3. TONE: Serious, breaking news, positive, concerning, etc.
4. EMOTION: What feelings should the visuals evoke
5. VISUAL RELEVANCE: What would viewers expect to see in this story

Return ONLY a JSON array of ${targetCount} search terms, ordered by relevance. Each term should be 1-3 words that will find appropriate stock footage.

FORMAT EXACTLY LIKE THIS:
["business meeting", "serious discussion", "news studio", "government building", "worried faces"]

SEARCH TERM GUIDELINES:
- Use generic, searchable terms (not specific people/brands)
- Focus on visual concepts that match the story
- Include establishing shots, reactions, and relevant environments
- Consider both literal and emotional visual elements
- Prioritize terms likely to return professional stock footage
- Mix wide shots, medium shots, and close-ups for variety

EXAMPLES OF GOOD SEARCH TERMS:
- For tech story: ["technology innovation", "computer screen", "data visualization", "modern office", "focused programmer"]
- For political story: ["government building", "serious meeting", "news conference", "voting booth", "concerned citizens"]
- For health story: ["medical consultation", "laboratory research", "hospital corridor", "healthcare worker", "scientific data"]
- For business story: ["corporate meeting", "stock market", "business handshake", "office building", "financial charts"]

Generate ${targetCount} search terms for the provided article:`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.3
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) {
      throw new Error('No search terms generated');
    }

    // Parse JSON response
    let searchTerms: string[];
    try {
      searchTerms = JSON.parse(result);
    } catch (parseError) {
      console.error('Failed to parse ChatGPT response as JSON:', result);
      // Fallback: extract terms from text
      searchTerms = extractSearchTermsFromText(result);
    }

    // Validate and clean search terms
    const validTerms = searchTerms
      .filter(term => typeof term === 'string' && term.length > 0)
      .map(term => term.toLowerCase().trim())
      .filter(term => term.length <= 30) // Reasonable length limit
      .slice(0, targetCount);

    if (validTerms.length === 0) {
      throw new Error('No valid search terms generated');
    }

    console.log(`✅ Generated ${validTerms.length} intelligent search terms:`, validTerms);
    return validTerms;

  } catch (error) {
    console.error('ChatGPT search term generation failed:', error);
    // Fallback to basic keyword extraction
    return generateFallbackSearchTerms(title, summary, targetCount);
  }
}

/**
 * Search for videos using intelligent search terms
 */
export async function searchContextualVideos(
  title: string,
  summary: string,
  targetVideoCount: number = 15
): Promise<VideoSearchResult[]> {
  console.log(`🎥 Starting contextual video search for ${targetVideoCount} videos...`);
  
  // Generate intelligent search terms
  const searchTerms = await generateContextualSearchTerms(title, summary, targetVideoCount * 2); // Get more terms than needed
  
  const videoResults: VideoSearchResult[] = [];
  
  // Search for videos using each term
  for (let i = 0; i < searchTerms.length && videoResults.length < targetVideoCount; i++) {
    const keyword = searchTerms[i];
    
    try {
      console.log(`🔍 Searching Pexels for: "${keyword}" (${i + 1}/${searchTerms.length})`);
      
      const videoUrl = await searchPexelsVideo(keyword);
      if (videoUrl) {
        videoResults.push({
          keyword,
          videoUrl,
          relevanceScore: targetVideoCount - i // Higher score for earlier (more relevant) terms
        });
        
        console.log(`✅ Found video for "${keyword}"`);
        
        // Small delay to be respectful to Pexels API
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        console.log(`❌ No video found for "${keyword}"`);
      }
    } catch (error) {
      console.error(`Error searching for "${keyword}":`, error.message);
    }
  }
  
  console.log(`🎬 Found ${videoResults.length} contextual videos`);
  
  // Sort by relevance score (higher is better)
  return videoResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Extract search terms from text if JSON parsing fails
 */
function extractSearchTermsFromText(text: string): string[] {
  // Try to extract quoted terms
  const quotedTerms = text.match(/"([^"]+)"/g);
  if (quotedTerms) {
    return quotedTerms.map(term => term.replace(/"/g, ''));
  }
  
  // Try to extract comma-separated terms
  const commaSeparated = text.split(',').map(term => term.trim());
  if (commaSeparated.length > 1) {
    return commaSeparated.filter(term => term.length > 0);
  }
  
  // Fallback: split by lines
  return text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
}

/**
 * Fallback search terms if ChatGPT fails
 */
function generateFallbackSearchTerms(title: string, summary: string, targetCount: number): string[] {
  console.log('🔄 Using fallback search term generation...');
  
  const text = `${title} ${summary}`.toLowerCase();
  
  // Basic keyword extraction with context awareness
  const fallbackMappings: Record<string, string[]> = {
    // Politics & Government
    'government': ['government building', 'serious meeting', 'official documents', 'press conference'],
    'political': ['politics debate', 'voting booth', 'campaign rally', 'government building'],
    'election': ['voting booth', 'ballot box', 'campaign rally', 'democracy'],
    'president': ['government building', 'official meeting', 'press conference', 'leadership'],
    
    // Business & Economy  
    'business': ['corporate meeting', 'office building', 'business handshake', 'professional'],
    'economy': ['stock market', 'financial charts', 'business district', 'economic data'],
    'market': ['stock market', 'trading floor', 'financial charts', 'business'],
    'financial': ['financial charts', 'banking', 'money', 'business meeting'],
    
    // Technology
    'technology': ['technology innovation', 'computer screen', 'digital display', 'modern office'],
    'tech': ['tech startup', 'computer programming', 'digital innovation', 'modern workspace'],
    'ai': ['artificial intelligence', 'robot technology', 'futuristic', 'computer science'],
    'digital': ['digital technology', 'computer screen', 'data visualization', 'modern tech'],
    
    // Health & Medical
    'health': ['medical consultation', 'hospital corridor', 'healthcare worker', 'medical equipment'],
    'medical': ['medical research', 'laboratory', 'doctor patient', 'hospital'],
    'hospital': ['hospital corridor', 'medical equipment', 'healthcare', 'emergency'],
    'covid': ['medical mask', 'healthcare worker', 'hospital', 'pandemic'],
    
    // Default generic terms
    'default': ['news studio', 'serious discussion', 'professional meeting', 'urban landscape', 'concerned faces']
  };
  
  const foundTerms: string[] = [];
  
  // Look for matches in the text
  for (const [key, terms] of Object.entries(fallbackMappings)) {
    if (text.includes(key) && key !== 'default') {
      foundTerms.push(...terms);
    }
  }
  
  // Add default terms if we don't have enough
  if (foundTerms.length < targetCount) {
    foundTerms.push(...fallbackMappings.default);
  }
  
  // Remove duplicates and limit to target count
  const uniqueTerms = [...new Set(foundTerms)].slice(0, targetCount);
  
  console.log(`✅ Generated ${uniqueTerms.length} fallback search terms:`, uniqueTerms);
  return uniqueTerms;
}