"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractContentFromUrl = extractContentFromUrl;
exports.summarizeForAudio = summarizeForAudio;
exports.extractContentDirect = extractContentDirect;
const axios_1 = __importDefault(require("axios"));
const readability_1 = require("@mozilla/readability");
const jsdom_1 = require("jsdom");
const openai_1 = __importDefault(require("openai"));
const prompts_1 = require("./prompts");
async function extractContentFromUrl(url) {
    if (!process.env.SCRAPINGBEE_API_KEY) {
        throw new Error('SCRAPINGBEE_API_KEY is required');
    }
    try {
        console.log(`🕷️ Extracting content from: ${url}`);
        const response = await axios_1.default.get('https://app.scrapingbee.com/api/v1/', {
            params: {
                api_key: process.env.SCRAPINGBEE_API_KEY,
                url: url,
                render_js: '0',
                wait: '1000'
            },
            timeout: 35000,
            responseType: 'arraybuffer'
        });
        if (response.status !== 200) {
            throw new Error(`ScrapingBee returned status ${response.status}`);
        }
        const html = response.data.toString();
        const dom = new jsdom_1.JSDOM(html, { url });
        const reader = new readability_1.Readability(dom.window.document);
        const article = reader.parse();
        if (!article || !article.textContent || article.textContent.length < 100) {
            throw new Error('Insufficient content extracted');
        }
        const cleanText = cleanContent(article.textContent);
        const wordCount = calculateWordCount(cleanText);
        const title = article.title || 'Untitled Article';
        const ogImage = extractOgImage(dom.window.document, url);
        console.log(`✅ Extracted ${cleanText.length} characters (${wordCount} words) from: ${title}`);
        return {
            title: cleanTitle(title),
            ogImage,
            text: cleanText,
            wordCount,
            url
        };
    }
    catch (error) {
        console.error('Content extraction failed:', error);
        return await handleExtractionError(error, url);
    }
}
function isTimeoutError(error) {
    return error.code === 'ECONNABORTED' || error.message.includes('timeout');
}
function createErrorMessage(status, statusText) {
    if (status === 429)
        return 'Rate limit exceeded. Please try again later.';
    if (status >= 400 && status < 500)
        return `Content extraction failed: Invalid request (${status})`;
    return `Content extraction failed: Service error (${status})`;
}
async function handleExtractionError(error, url) {
    if (error.response) {
        const status = error.response.status;
        const statusText = error.response.statusText || 'Unknown error';
        console.error(`🚨 ScrapingBee error (${status}): ${statusText}`);
        if (status === 500 || isTimeoutError(error)) {
            console.error('🚨 Retrying with fallback strategy');
            return await extractContentWithFallback(url);
        }
        throw new Error(createErrorMessage(status, statusText));
    }
    if (isTimeoutError(error)) {
        console.error('🚨 ScrapingBee timeout - trying fallback');
        return await extractContentWithFallback(url);
    }
    throw new Error(`Content extraction failed: ${error.message}`);
}
// Fallback extraction method with simpler parameters
async function extractContentWithFallback(url) {
    try {
        console.log(`🔄 Trying fallback extraction for: ${url}`);
        const response = await axios_1.default.get('https://app.scrapingbee.com/api/v1/', {
            params: {
                api_key: process.env.SCRAPINGBEE_API_KEY,
                url: url,
                render_js: '0', // Disable JS rendering for faster response
                wait: '0' // No wait time
            },
            timeout: 20000, // Shorter timeout
            responseType: 'arraybuffer'
        });
        if (response.status !== 200) {
            throw new Error(`Fallback extraction failed with status ${response.status}`);
        }
        const html = response.data.toString();
        const dom = new jsdom_1.JSDOM(html, { url });
        const reader = new readability_1.Readability(dom.window.document);
        const article = reader.parse();
        if (!article || !article.textContent || article.textContent.length < 50) {
            // More lenient content length for fallback
            throw new Error('Insufficient content from fallback extraction');
        }
        const cleanText = cleanContent(article.textContent);
        const wordCount = calculateWordCount(cleanText);
        const title = article.title || extractTitleFromUrl(url);
        const ogImage = extractOgImage(dom.window.document, url);
        console.log(`✅ Fallback extracted ${cleanText.length} characters (${wordCount} words) from: ${title}`);
        return {
            title: cleanTitle(title),
            ogImage,
            text: cleanText,
            wordCount,
            url
        };
    }
    catch (error) {
        console.error('Fallback extraction also failed:', error);
        // Generate a minimal content object as last resort
        const fallbackText = `Content extraction temporarily unavailable for this link. Please try visiting ${url} directly.`;
        return {
            title: extractTitleFromUrl(url),
            text: fallbackText,
            wordCount: calculateWordCount(fallbackText),
            url,
            ogImage: undefined
        };
    }
}
function extractTitleFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace('www.', '');
        const path = urlObj.pathname;
        // Try to extract meaningful title from URL
        if (path && path !== '/') {
            const segments = path.split('/').filter(s => s.length > 0);
            if (segments.length > 0) {
                const lastSegment = segments[segments.length - 1];
                return `${hostname}: ${lastSegment.replace(/[-_]/g, ' ')}`;
            }
        }
        return `Content from ${hostname}`;
    }
    catch {
        return 'Shared Link';
    }
}
function cleanContent(text) {
    return text
        .replace(/<[^>]*>/g, '')
        .replace(/&[a-zA-Z0-9#]+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function cleanTitle(title) {
    return title
        .replace(/\s*[-–—|]\s*.+$/, '')
        .replace(/\s+/g, ' ')
        .trim();
}
function calculateWordCount(text) {
    if (!text || text.trim().length === 0) {
        return 0;
    }
    // Split by whitespace and filter out empty strings
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    return words.length;
}
async function summarizeForAudio(text, maxWords = 150, sourceUrl) {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is required');
    }
    const words = text.split(/\s+/);
    if (words.length <= maxWords) {
        // Even for short text, we want to add source attribution and structure
        const openai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY
        });
        const prompt = prompts_1.PROMPTS.summarizeForAudio(maxWords, sourceUrl).replace('{text}', text);
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{
                    role: "user",
                    content: prompt
                }],
            max_tokens: Math.ceil(maxWords * 1.5),
            temperature: 0.3
        });
        const summary = response.choices[0]?.message?.content?.trim();
        if (summary)
            return summary;
    }
    console.log(`🤖 Summarizing ${words.length} words to ${maxWords} words with storytelling format`);
    const openai = new openai_1.default({
        apiKey: process.env.OPENAI_API_KEY
    });
    const prompt = prompts_1.PROMPTS.summarizeForAudio(maxWords, sourceUrl).replace('{text}', text.substring(0, 12000));
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
                role: "user",
                content: prompt
            }],
        max_tokens: Math.ceil(maxWords * 1.5),
        temperature: 0.3
    });
    const summary = response.choices[0]?.message?.content?.trim();
    if (!summary) {
        throw new Error('Failed to generate summary');
    }
    return summary;
}
const IMAGE_SELECTORS = [
    { selector: 'meta[property="og:image"]', attr: 'content', name: 'og:image' },
    { selector: 'meta[name="twitter:image"]', attr: 'content', name: 'twitter:image' },
    { selector: 'link[rel="image_src"]', attr: 'href', name: 'image_src' }
];
function tryExtractImage(document, baseUrl, config) {
    const element = document.querySelector(config.selector);
    if (!element)
        return undefined;
    const content = element.getAttribute(config.attr);
    console.log(`Found ${config.name}:`, content);
    if (!content)
        return undefined;
    const resolvedUrl = resolveImageUrl(content, baseUrl);
    if (isValidImageUrl(resolvedUrl)) {
        console.log(`✅ Using ${config.name}:`, resolvedUrl);
        return resolvedUrl;
    }
    return undefined;
}
function extractOgImage(document, baseUrl) {
    console.log('🖼️ Extracting OG image...');
    for (const config of IMAGE_SELECTORS) {
        const imageUrl = tryExtractImage(document, baseUrl, config);
        if (imageUrl)
            return imageUrl;
    }
    console.log('❌ No OG image found');
    return undefined;
}
function isValidImageUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    }
    catch {
        return false;
    }
}
function resolveImageUrl(imageUrl, baseUrl) {
    try {
        return new URL(imageUrl, baseUrl).href;
    }
    catch {
        return imageUrl;
    }
}
// Direct extraction method without ScrapingBee for video generator
async function extractContentDirect(url) {
    try {
        console.log(`🔗 Direct extraction from: ${url}`);
        // Fetch content directly
        const response = await axios_1.default.get(url, {
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        if (response.status !== 200) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const html = response.data;
        const dom = new jsdom_1.JSDOM(html, { url });
        const reader = new readability_1.Readability(dom.window.document);
        const article = reader.parse();
        if (!article || !article.textContent || article.textContent.length < 100) {
            throw new Error('Insufficient content extracted from article');
        }
        const cleanText = cleanContent(article.textContent);
        const wordCount = calculateWordCount(cleanText);
        const title = cleanTitle(article.title || 'Untitled Article');
        const ogImage = extractOgImage(dom.window.document, url);
        console.log(`✅ Direct extraction completed: ${title} (${wordCount} words)`);
        return {
            title,
            text: cleanText,
            url,
            wordCount,
            ogImage
        };
    }
    catch (error) {
        console.error(`❌ Direct extraction failed for ${url}:`, error.message);
        throw new Error(`Direct content extraction failed: ${error.message}`);
    }
}
