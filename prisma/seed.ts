import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding...')

  // Create a test team
  const testTeam = await prisma.team.create({
    data: {
      slackTeamId: 'T1234567890',
      teamName: 'Test Team',
      accessToken: 'xoxb-test-token',
      botUserId: 'U1234567890',
      isActive: true,
    },
  })

  // Create a subscription for the test team
  await prisma.subscription.create({
    data: {
      teamId: testTeam.id,
      status: 'TRIAL',
      monthlyLinkLimit: 50,
    },
  })

  // Create a test channel
  const testChannel = await prisma.channel.create({
    data: {
      slackChannelId: 'C1234567890',
      channelName: 'general',
      teamId: testTeam.id,
      isActive: true,
    },
  })

  // Create some test processed links
  await prisma.processedLink.createMany({
    data: [
      {
        url: 'https://example.com/article1',
        messageTs: '1234567890.123456',
        channelId: testChannel.id,
        teamId: testTeam.id,
        title: 'Test Article 1',
        extractedText: 'This is a test article content...',
        processingStatus: 'COMPLETED',
      },
      {
        url: 'https://example.com/article2',
        messageTs: '1234567891.123456',
        channelId: testChannel.id,
        teamId: testTeam.id,
        title: 'Test Article 2',
        extractedText: 'This is another test article content...',
        processingStatus: 'COMPLETED',
      },
    ],
  })

  console.log(`Created test team: ${testTeam.id}`)
  console.log('Seeding finished.')
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