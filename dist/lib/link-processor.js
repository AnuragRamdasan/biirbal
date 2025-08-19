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
const logger_1 = require("./logger");
async function validateLinkProcessing({ url, teamId, slackTeamId }) {
    const db = await (0, db_1.getDbClient)();
    const team = await db.team.findUnique({
        where: { id: teamId },
        include: { subscription: true }
    });
    if (!team) {
        throw new Error('Team not found');
    }
    // Check usage limits
    const subscriptionTeamId = slackTeamId || team.slackTeamId;
    const usageCheck = await (0, subscription_utils_1.canProcessNewLink)(subscriptionTeamId);
    const isExceptionTeamFlag = (0, exception_teams_1.isExceptionTeam)(subscriptionTeamId);
    const isLimitExceeded = !usageCheck.allowed && !isExceptionTeamFlag;
    // Track link shared event
    try {
        const urlObj = new URL(url);
        (0, analytics_1.trackLinkShared)({
            team_id: subscriptionTeamId,
            channel_id: teamId,
            link_domain: urlObj.hostname,
            user_id: url // Using URL as proxy identifier
        });
    }
    catch (error) {
        console.log('Failed to track link shared event:', error);
    }
    return { team, subscriptionTeamId, isLimitExceeded };
}
async function setupChannelAndRecord({ channelId, teamId, url, messageTs, linkId, team }) {
    const db = await (0, db_1.getDbClient)();
    // Get channel info from Slack
    const channelSlackClient = new web_api_1.WebClient(team.accessToken);
    let channelName = null;
    try {
        const channelInfo = await channelSlackClient.conversations.info({ channel: channelId });
        channelName = channelInfo.channel?.name || null;
        console.log(`📋 Channel info retrieved: ${channelName}`);
    }
    catch (error) {
        console.warn('Failed to get channel info from Slack:', error);
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
    // Check for existing processed link with same URL (duplicate detection)
    let existingLink = null;
    if (!linkId) {
        existingLink = await db.processedLink.findFirst({
            where: {
                url,
                processingStatus: 'COMPLETED',
                extractedText: { not: null },
                audioFileUrl: { not: null }
            },
            orderBy: { createdAt: 'desc' }
        });
        if (existingLink) {
            console.log(`🔁 Found existing processed link for URL: ${existingLink.id}`);
        }
    }
    // Create or update processing record
    let processedLink;
    if (linkId) {
        console.log(`🔄 Restarting existing link ID: ${linkId}`);
        processedLink = await db.processedLink.update({
            where: { id: linkId },
            data: {
                processingStatus: 'PROCESSING',
                errorMessage: null,
                updatedAt: new Date()
            }
        });
    }
    else {
        processedLink = await db.processedLink.upsert({
            where: {
                url_messageTs_channelId: {
                    url,
                    messageTs,
                    channelId: channel.id
                }
            },
            update: { processingStatus: 'PROCESSING' },
            create: {
                url,
                messageTs,
                channelId: channel.id,
                teamId,
                processingStatus: 'PROCESSING'
            }
        });
    }
    return { channel, processedLink, existingLink };
}
async function copyExistingLinkData(existingLink, processedLinkId, updateProgress) {
    console.log('📋 Copying existing link data...');
    const db = await (0, db_1.getDbClient)();
    if (updateProgress)
        await updateProgress(50);
    // Copy all the processed data from the existing link
    await db.processedLink.update({
        where: { id: processedLinkId },
        data: {
            title: existingLink.title,
            extractedText: existingLink.extractedText,
            wordCount: existingLink.wordCount,
            audioFileUrl: existingLink.audioFileUrl,
            audioFileKey: existingLink.audioFileKey,
            ttsScript: existingLink.ttsScript,
            ogImage: existingLink.ogImage,
            processingStatus: 'COMPLETED'
        }
    });
    if (updateProgress)
        await updateProgress(90);
    console.log('✅ Successfully copied existing link data');
}
async function processContentAndAudio(url, updateProgress) {
    // Extract content
    const extractedContent = await (0, content_extractor_1.extractContentFromUrl)(url);
    if (updateProgress)
        await updateProgress(50);
    // Summarize content
    const summary = await (0, content_extractor_1.summarizeForAudio)(extractedContent.text, 150, extractedContent.url);
    if (updateProgress)
        await updateProgress(60);
    // Generate audio
    const audioResult = await (0, text_to_speech_1.generateAudioSummary)(summary, extractedContent.title);
    if (updateProgress)
        await updateProgress(80);
    // Upload to storage
    const audioUrl = await (0, text_to_speech_1.uploadAudioToStorage)(audioResult.audioBuffer, audioResult.fileName);
    if (updateProgress)
        await updateProgress(90);
    return { extractedContent, summary, audioUrl, audioResult };
}
async function notifySlack(context, params, updateProgress) {
    const { team, processedLink, isLimitExceeded } = context;
    const { channelId, messageTs } = params;
    // Skip Slack notifications for web-only teams (no Slack integration)
    if (!team.accessToken || !team.slackTeamId || team.slackTeamId.startsWith('web_')) {
        console.log(`📧 Skipping Slack notification for web-only team: ${team.slackTeamId || team.id}`);
        if (updateProgress)
            await updateProgress(100);
        return;
    }
    const slackClient = new web_api_1.WebClient(team.accessToken);
    const baseMessage = `🎧 Audio summary ready: ${(0, config_1.getDashboardUrl)(processedLink.id)}`;
    const limitMessage = isLimitExceeded ? `\n\n⚠️ Note: You've exceeded your monthly limit. Upgrade to access playbook on dashboard.` : '';
    const fullMessage = baseMessage + limitMessage;
    if (team.sendSummaryAsDM) {
        await sendDMsToTeamMembers(slackClient, team.id, fullMessage);
    }
    else {
        await slackClient.chat.postMessage({
            channel: channelId,
            thread_ts: messageTs,
            text: fullMessage
        });
    }
    if (updateProgress)
        await updateProgress(100);
}
async function sendDMsToTeamMembers(slackClient, teamId, message) {
    const db = await (0, db_1.getDbClient)();
    const activeMembers = await db.teamMembership.findMany({
        where: {
            teamId,
            isActive: true,
            slackUserId: { not: null }
        },
        select: {
            slackUserId: true,
            displayName: true,
            user: {
                select: {
                    name: true
                }
            }
        }
    });
    const dmPromises = activeMembers.map(async (member) => {
        if (!member.slackUserId)
            return;
        try {
            await slackClient.chat.postMessage({
                channel: member.slackUserId,
                text: message
            });
        }
        catch (error) {
            console.error(`❌ Failed to send DM to ${member.displayName || member.user.name} (${member.slackUserId}):`, error);
        }
    });
    await Promise.all(dmPromises);
}
function trackProcessingMetrics(context, success, extractedContent) {
    const { subscriptionTeamId, processedLink, processingStartTime } = context;
    const processingTimeSeconds = (Date.now() - processingStartTime) / 1000;
    (0, analytics_1.trackLinkProcessed)({
        team_id: subscriptionTeamId,
        link_id: success ? processedLink.id : 'failed',
        processing_time_seconds: processingTimeSeconds,
        success,
        content_type: success && extractedContent?.title ? 'article' : success ? 'unknown' : 'error',
        word_count: success && extractedContent?.text ? extractedContent.text.split(' ').length : 0
    });
}
async function processLink(params, updateProgress) {
    const linkLogger = logger_1.logger.child('link-processor');
    linkLogger.info('Processing link', { url: params.url, channelId: params.channelId, teamId: params.teamId });
    const processingStartTime = Date.now();
    let context = { processingStartTime };
    try {
        if (updateProgress)
            await updateProgress(20);
        // Step 1: Validate and setup
        const { team, subscriptionTeamId, isLimitExceeded } = await validateLinkProcessing(params);
        const { channel, processedLink, existingLink } = await setupChannelAndRecord({ ...params, team });
        context = {
            team,
            channel,
            processedLink,
            subscriptionTeamId,
            isLimitExceeded,
            processingStartTime
        };
        if (updateProgress)
            await updateProgress(30);
        // Step 2: Check if we can reuse existing processed link
        if (existingLink) {
            console.log('🚀 Using existing processed link data - skipping content processing');
            await copyExistingLinkData(existingLink, processedLink.id, updateProgress);
            // Create mock extractedContent for analytics with existing data
            const mockExtractedContent = {
                title: existingLink.title,
                text: existingLink.extractedText,
                wordCount: existingLink.wordCount
            };
            // Step 4: Notify Slack
            await notifySlack(context, params, updateProgress);
            trackProcessingMetrics(context, true, mockExtractedContent);
        }
        else {
            // Step 2: Process content and generate audio (original flow)
            const { extractedContent, summary, audioUrl, audioResult } = await processContentAndAudio(params.url, updateProgress);
            // Step 3: Update database
            console.log('💾 Updating database...');
            const db = await (0, db_1.getDbClient)();
            await db.processedLink.update({
                where: { id: processedLink.id },
                data: {
                    title: extractedContent.title,
                    extractedText: summary,
                    wordCount: extractedContent.wordCount,
                    audioFileUrl: audioUrl,
                    audioFileKey: audioResult.fileName,
                    ttsScript: audioResult.ttsScript,
                    ogImage: extractedContent.ogImage,
                    processingStatus: 'COMPLETED'
                }
            });
            // Step 4: Notify Slack
            await notifySlack(context, params, updateProgress);
            trackProcessingMetrics(context, true, extractedContent);
        }
    }
    catch (error) {
        console.error('Link processing failed:', error);
        if (context.subscriptionTeamId) {
            trackProcessingMetrics(context, false);
        }
        throw error;
    }
}
