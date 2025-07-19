"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROMPTS = void 0;
exports.PROMPTS = {
    summarizeForAudio: (maxWords) => `As a professional summarizer, create a concise and comprehensive summary of the provided text, be it an article, post, conversation, or passage, while adhering to these guidelines:

Craft a summary that is detailed, thorough, in-depth, and complex, while maintaining clarity and conciseness.

Incorporate main ideas and essential information, eliminating extraneous language and focusing on critical aspects.

Rely strictly on the provided text, without including external information.

Format the summary in paragraph form for easy understanding.

Keep the summary under ${maxWords} words and optimize it for audio narration with clear, flowing sentences.

Text to summarize:
{text}`,
    extractTitle: (text) => `Extract a clear, descriptive title from this article content. The title should be engaging and accurately represent the main topic:

{text}`,
    generateExcerpt: (text, maxWords = 50) => `Create a brief excerpt from this article that captures the main point. Keep it under ${maxWords} words and make it engaging:

{text}`
};
