"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processLink = processLink;
const db_1 = require("./db");
const content_extractor_1 = require("./content-extractor");
const text_to_speech_1 = require("./text-to-speech");
const config_1 = require("./config");
const web_api_1 = require("@slack/web-api");
const subscription_utils_1 = require("./subscription-utils");
const exception_teams_1 = require("./exception-teams");
const analytics_1 = require("./analytics");
async function processLink({ url, messageTs, channelId, teamId, linkId }, updateProgress) {
    console.log(`🚀 Processing: ${url}`);
    const processingStartTime = Date.now();
    try {
        console.log('💾 Getting database client...');
        const db = await (0, db_1.getDbClient)();
        console.log('✅ Database client ready');
        if (updateProgress)
            await updateProgress(20);
        // Get team and setup channel
        const team = await db.team.findUnique({
            where: { id: teamId },
            include: { subscription: true }
        });
        if (!team) {
            throw new Error('Team not found');
        }
        // Check if usage limits are exceeded (but don't block processing)
        const usageCheck = await (0, subscription_utils_1.canProcessNewLink)(teamId);
        const isExceptionTeamFlag = (0, exception_teams_1.isExceptionTeam)(teamId);
        const isLimitExceeded = !usageCheck.allowed && !isExceptionTeamFlag;
        // Track link shared event
        try {
            const urlObj = new URL(url);
            (0, analytics_1.trackLinkShared)({
                team_id: teamId,
                channel_id: channelId,
                link_domain: urlObj.hostname,
                user_id: messageTs // Using messageTs as proxy for user identifier
            });
        }
        catch (error) {
            console.log('Failed to track link shared event:', error);
        }
        // Get channel info from Slack API to get the channel name
        const channelSlackClient = new web_api_1.WebClient(team.accessToken);
        let channelName = null;
        try {
            const channelInfo = await channelSlackClient.conversations.info({
                channel: channelId
            });
            channelName = channelInfo.channel?.name || null;
            console.log(`📋 Channel info retrieved: ${channelName}`);
        }
        catch (error) {
            console.warn('Failed to get channel info from Slack:', error);
            // Continue processing even if we can't get channel name
        }
        const channel = await db.channel.upsert({
            where: { slackChannelId: channelId },
            update: {
                teamId,
                isActive: true,
                ...(channelName && { channelName })
            },
            create: {
                slackChannelId: channelId,
                teamId,
                isActive: true,
                ...(channelName && { channelName })
            }
        });
        // Create or update processing record
        let processedLink;
        if (linkId) {
            // This is a restarted job - update the existing record
            console.log(`🔄 Restarting existing link ID: ${linkId}`);
            processedLink = await db.processedLink.update({
                where: { id: linkId },
                data: {
                    processingStatus: 'PROCESSING',
                    errorMessage: null, // Clear any previous error
                    updatedAt: new Date()
                }
            });
        }
        else {
            // Normal new job processing
            processedLink = await db.processedLink.upsert({
                where: {
                    url_messageTs_channelId: {
                        url,
                        messageTs,
                        channelId: channel.id
                    }
                },
                update: {
                    processingStatus: 'PROCESSING'
                },
                create: {
                    url,
                    messageTs,
                    channelId: channel.id,
                    teamId,
                    processingStatus: 'PROCESSING'
                }
            });
        }
        if (updateProgress)
            await updateProgress(30);
        // 1. Extract content with ScrapingBee
        console.log('📄 Extracting content...');
        const extractedContent = await (0, content_extractor_1.extractContentFromUrl)(url);
        if (updateProgress)
            await updateProgress(50);
        // 2. Summarize with OpenAI
        console.log('🤖 Summarizing content...');
        const summary = await (0, content_extractor_1.summarizeForAudio)(extractedContent.text, 150, extractedContent.url);
        console.log('🖼️ OG Image extracted:', extractedContent.ogImage);
        if (updateProgress)
            await updateProgress(60);
        // 3. Generate audio with OpenAI TTS
        console.log('🎤 Generating audio...');
        const audioResult = await (0, text_to_speech_1.generateAudioSummary)(summary, extractedContent.title);
        if (updateProgress)
            await updateProgress(80);
        // 4. Upload to S3
        console.log('☁️ Uploading audio...');
        const audioUrl = await (0, text_to_speech_1.uploadAudioToStorage)(audioResult.audioBuffer, audioResult.fileName);
        if (updateProgress)
            await updateProgress(90);
        // 5. Update database
        console.log('💾 Updating database...');
        await db.processedLink.update({
            where: { id: processedLink.id },
            data: {
                title: extractedContent.title,
                extractedText: summary,
                audioFileUrl: audioUrl,
                audioFileKey: audioResult.fileName,
                ttsScript: audioResult.ttsScript,
                ogImage: extractedContent.ogImage,
                processingStatus: 'COMPLETED'
            }
        });
        // 6. Notify Slack
        console.log('📱 Notifying Slack...');
        const slackClient = new web_api_1.WebClient(team.accessToken);
        const baseMessage = `🎧 Audio summary ready: ${(0, config_1.getDashboardUrl)(processedLink.id)}`;
        const limitMessage = isLimitExceeded ? `\n\n⚠️ Note: You've exceeded your monthly limit. Upgrade to access playback on dashboard.` : '';
        await slackClient.chat.postMessage({
            channel: channelId,
            thread_ts: messageTs,
            text: baseMessage + limitMessage
        });
        if (updateProgress)
            await updateProgress(100);
        console.log(`✅ Successfully processed: ${url}`);
        // Track successful link processing
        const processingTimeSeconds = (Date.now() - processingStartTime) / 1000;
        (0, analytics_1.trackLinkProcessed)({
            team_id: teamId,
            link_id: processedLink.id,
            processing_time_seconds: processingTimeSeconds,
            success: true,
            content_type: extractedContent.title ? 'article' : 'unknown',
            word_count: extractedContent.text?.split(' ').length || 0
        });
    }
    catch (error) {
        console.error('Link processing failed:', error);
        // Track failed link processing
        const processingTimeSeconds = (Date.now() - processingStartTime) / 1000;
        (0, analytics_1.trackLinkProcessed)({
            team_id: teamId,
            link_id: 'failed',
            processing_time_seconds: processingTimeSeconds,
            success: false,
            content_type: 'error',
            word_count: 0
        });
        throw error;
    }
}
