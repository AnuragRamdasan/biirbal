"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractContentFromUrl = extractContentFromUrl;
exports.summarizeForAudio = summarizeForAudio;
const axios_1 = __importDefault(require("axios"));
const readability_1 = require("@mozilla/readability");
const jsdom_1 = require("jsdom");
const openai_1 = __importDefault(require("openai"));
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
        const title = article.title || 'Untitled Article';
        console.log(`✅ Extracted ${cleanText.length} characters from: ${title}`);
        return {
            title: cleanTitle(title),
            text: cleanText,
            url
        };
    }
    catch (error) {
        console.error('Content extraction failed:', error);
        throw new Error(`Content extraction failed: ${error.message}`);
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
async function summarizeForAudio(text, maxWords = 200) {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is required');
    }
    const words = text.split(/\s+/);
    if (words.length <= maxWords) {
        return text;
    }
    console.log(`🤖 Summarizing ${words.length} words to ${maxWords} words`);
    const openai = new openai_1.default({
        apiKey: process.env.OPENAI_API_KEY
    });
    const prompt = `Create a concise summary of this article for audio narration. Keep it under ${maxWords} words:

${text.substring(0, 12000)}`;
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
    console.log(`✅ Generated ${summary.split(/\s+/).length} word summary`);
    return summary;
}
