"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAudioSummary = generateAudioSummary;
exports.uploadAudioToStorage = uploadAudioToStorage;
exports.generateAudioFromText = generateAudioFromText;
exports.uploadAudioToS3 = uploadAudioToS3;
const openai_1 = __importDefault(require("openai"));
const client_s3_1 = require("@aws-sdk/client-s3");
async function generateAudioSummary(text, title) {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is required');
    }
    console.log(`🎤 Generating audio for: ${title.substring(0, 50)}...`);
    const openai = new openai_1.default({
        apiKey: process.env.OPENAI_API_KEY
    });
    const processedText = `Here's a summary of ${title}: ${text}`;
    console.log(`📝 Converting ${processedText.split(' ').length} words to speech`);
    const response = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: processedText,
        response_format: 'mp3',
        speed: 1.1
    });
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    const fileName = `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
    console.log(`✅ Generated ${(audioBuffer.length / 1024).toFixed(1)}KB audio file`);
    return {
        audioBuffer,
        fileName,
        ttsScript: processedText
    };
}
async function uploadAudioToStorage(audioBuffer, fileName) {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (!bucketName || !accessKeyId || !secretAccessKey) {
        throw new Error('AWS S3 configuration required');
    }
    const s3Client = new client_s3_1.S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
            accessKeyId,
            secretAccessKey
        }
    });
    console.log(`☁️ Uploading ${fileName} to S3`);
    const key = `audio/${fileName}`;
    const command = new client_s3_1.PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: audioBuffer,
        ContentType: 'audio/mpeg'
    });
    await s3Client.send(command);
    const region = process.env.AWS_REGION || 'us-east-1';
    const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
    console.log(`✅ Audio uploaded: ${publicUrl}`);
    return publicUrl;
}
// Additional functions expected by tests
async function generateAudioFromText(text) {
    if (!text || text.trim().length === 0) {
        throw new Error('Text content is required');
    }
    // Truncate very long text
    const truncatedText = text.length > 4000 ? text.substring(0, 4000) + '...' : text;
    const audioResult = await generateAudioSummary(truncatedText, 'Content Summary');
    const audioUrl = await uploadAudioToStorage(audioResult.audioBuffer, audioResult.fileName);
    // Estimate duration based on text length (approximate: ~150 words per minute)
    const wordCount = truncatedText.split(/\s+/).length;
    const estimatedDuration = Math.max(10, (wordCount / 150) * 60); // Minimum 10 seconds
    return {
        audioUrl,
        duration: estimatedDuration
    };
}
async function uploadAudioToS3(audioBuffer, fileName) {
    return uploadAudioToStorage(audioBuffer, fileName);
}
