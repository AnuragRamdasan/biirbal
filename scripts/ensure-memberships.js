/*
  Node-compatible version for Heroku one-off dynos.
  Uses @prisma/client directly so it works without tsx/ts-node.
*/

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

async function ensurePersonalTeamForUser(user) {
  const memberships = await prisma.teamMembership.count({
    where: { userId: user.id, isActive: true },
  })
  if (memberships > 0) return false

  const displayName = user.name || (user.email ? user.email.split('@')[0] : 'User')
  const webTeamId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const team = await prisma.team.create({
    data: {
      slackTeamId: webTeamId,
      teamName: `${displayName}'s Team`,
      isActive: true,
      subscription: {
        create: {
          status: 'TRIAL',
          planId: 'free',
          monthlyLinkLimit: 20,
          userLimit: 1,
        },
      },
    },
  })

  await prisma.teamMembership.create({
    data: {
      userId: user.id,
      teamId: team.id,
      role: 'admin',
      isActive: true,
    },
  })

  return true
}

async function main() {
  console.log('Ensuring at least one team membership for all users...')

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  })

  let created = 0
  for (const user of users) {
    const changed = await ensurePersonalTeamForUser(user)
    if (changed) {
      created += 1
      console.log(`+ created membership for user ${user.email || user.id}`)
    }
  }

  console.log(`Done. Users updated: ${created}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    try {
      await prisma.$disconnect()
    } catch (_) {}
  })


