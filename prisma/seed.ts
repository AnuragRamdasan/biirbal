import { PrismaClient } from '@prisma/client'
import { ProcessingStatus, SubscriptionStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed process...')

  // Create a development team
  const team = await prisma.team.upsert({
    where: { slackTeamId: 'T_DEV_TEAM' },
    update: {},
    create: {
      slackTeamId: 'T_DEV_TEAM',
      teamName: 'Development Team',
      accessToken: 'xoxb-dev-token-123',
      botUserId: 'U_BOT_DEV',
      isActive: true,
      sendSummaryAsDM: false,
    },
  })

  console.log('✅ Created development team:', team.teamName)

  // Create development user (permanently logged in)
  const devUser = await prisma.user.upsert({
    where: { email: 'dev@biirbal.ai' },
    update: {},
    create: {
      name: 'dev-user',
      email: 'dev@biirbal.ai',
      emailVerified: new Date(),
    },
  })

  console.log('✅ Created development user:', devUser.email)

  // Create team membership for development user
  const devMembership = await prisma.teamMembership.upsert({
    where: {
      userId_teamId: {
        userId: devUser.id,
        teamId: team.id,
      },
    },
    update: {},
    create: {
      userId: devUser.id,
      teamId: team.id,
      slackUserId: 'U_DEV_USER',
      displayName: 'Development User',
      realName: 'Dev User',
      profileImage24: 'https://via.placeholder.com/24',
      profileImage32: 'https://via.placeholder.com/32',
      profileImage48: 'https://via.placeholder.com/48',
      title: 'Developer',
      userAccessToken: 'xoxp-dev-user-token',
      role: 'admin',
      isActive: true,
    },
  })

  console.log('✅ Created development user:', devUser.email)

  // Create development channels
  const generalChannel = await prisma.channel.upsert({
    where: { slackChannelId: 'C_DEV_GENERAL' },
    update: {},
    create: {
      slackChannelId: 'C_DEV_GENERAL',
      channelName: 'general',
      teamId: team.id,
      isActive: true,
    },
  })

  const randomChannel = await prisma.channel.upsert({
    where: { slackChannelId: 'C_DEV_RANDOM' },
    update: {},
    create: {
      slackChannelId: 'C_DEV_RANDOM',
      channelName: 'random',
      teamId: team.id,
      isActive: true,
    },
  })

  console.log('✅ Created development channels:', generalChannel.channelName, randomChannel.channelName)

  // Create a subscription for the team
  const subscription = await prisma.subscription.upsert({
    where: { teamId: team.id },
    update: {},
    create: {
      teamId: team.id,
      status: SubscriptionStatus.TRIAL,
      planId: 'free',
      monthlyLinkLimit: 100, // Higher limit for dev
      userLimit: 10,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  })

  console.log('✅ Created subscription for team')

  // Create sample processed links with various statuses
  const sampleLinks = [
    {
      url: 'https://techcrunch.com/2024/01/15/ai-startup-raises-funding',
      title: 'AI Startup Raises $50M in Series A Funding',
      extractedText: 'An innovative AI startup focused on automated content summarization has successfully raised $50 million in Series A funding...',
      processingStatus: ProcessingStatus.COMPLETED,
      audioFileUrl: 'https://example.com/audio/sample1.mp3',
      ogImage: 'https://via.placeholder.com/600x400/0066cc/ffffff?text=TechCrunch',
      channelId: generalChannel.id,
      messageTs: '1705123456.001',
    },
    {
      url: 'https://github.com/microsoft/TypeScript/releases/tag/v5.3.0',
      title: 'TypeScript 5.3 Release Notes',
      extractedText: 'TypeScript 5.3 introduces several new features including improved type inference, better error messages...',
      processingStatus: ProcessingStatus.COMPLETED,
      audioFileUrl: 'https://example.com/audio/sample2.mp3',
      ogImage: 'https://via.placeholder.com/600x400/24292e/ffffff?text=GitHub',
      channelId: randomChannel.id,
      messageTs: '1705123456.002',
    },
    {
      url: 'https://nextjs.org/blog/next-14-2',
      title: 'Next.js 14.2 Release',
      extractedText: 'Next.js 14.2 brings performance improvements, new developer experience features...',
      processingStatus: ProcessingStatus.PROCESSING,
      channelId: generalChannel.id,
      messageTs: '1705123456.003',
    },
    {
      url: 'https://www.example.com/broken-link',
      title: 'Failed Processing Example',
      processingStatus: ProcessingStatus.FAILED,
      errorMessage: 'Failed to extract content: Connection timeout',
      channelId: randomChannel.id,
      messageTs: '1705123456.004',
    },
  ]

  for (const linkData of sampleLinks) {
    const processedLink = await prisma.processedLink.upsert({
      where: {
        url_messageTs_channelId: {
          url: linkData.url,
          messageTs: linkData.messageTs,
          channelId: linkData.channelId,
        },
      },
      update: {},
      create: {
        ...linkData,
        teamId: team.id,
        ttsScript: linkData.extractedText ? `Here's a summary of the article: ${linkData.extractedText.substring(0, 200)}...` : null,
      },
    })

    console.log('✅ Created processed link:', processedLink.title || processedLink.url)

    // Add some audio listens for completed links
    if (linkData.processingStatus === ProcessingStatus.COMPLETED) {
      await prisma.audioListen.create({
        data: {
          processedLinkId: processedLink.id,
          userId: devUser.id,
          slackUserId: 'U_DEV_USER',
          completed: true,
          listenDuration: Math.floor(Math.random() * 60) + 30, // 30-90 seconds
          resumePosition: 0,
        },
      })
    }
  }

  // Create some additional users for testing multi-user scenarios
  const additionalUsers = [
    {
      email: 'alice@biirbal.ai',
      name: 'alice',
      displayName: 'Alice Developer',
      slackUserId: 'U_ALICE',
    },
    {
      email: 'bob@biirbal.ai',
      name: 'bob',
      displayName: 'Bob Tester',
      slackUserId: 'U_BOB',
    },
  ]

  for (const userData of additionalUsers) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        name: userData.name,
        email: userData.email,
        emailVerified: new Date(),
      },
    })

    // Create team membership for additional user
    await prisma.teamMembership.upsert({
      where: {
        userId_teamId: {
          userId: user.id,
          teamId: team.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        teamId: team.id,
        slackUserId: userData.slackUserId,
        displayName: userData.displayName,
        realName: userData.displayName,
        role: 'member',
        isActive: true,
      },
    })

    console.log('✅ Created additional user:', user.email)
  }

  console.log('🎉 Seed process completed successfully!')
  console.log('')
  console.log('Development credentials:')
  console.log('- Email: dev@biirbal.ai')
  console.log('- Team: Development Team')
  console.log('- Slack Team ID: T_DEV_TEAM')
  console.log('- Slack User ID: U_DEV_USER')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })