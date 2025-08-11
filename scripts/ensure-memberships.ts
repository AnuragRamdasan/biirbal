import 'dotenv/config'
import { prisma } from '@/lib/db'

async function ensurePersonalTeamForUser(userId: string, userName?: string | null, userEmail?: string | null) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { memberships: { include: { team: true } } },
  })
  if (!dbUser) return

  const hasMembership = dbUser.memberships.length > 0
  if (hasMembership) return

  const displayName = userName || userEmail?.split('@')[0] || 'User'
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
      userId: dbUser.id,
      teamId: team.id,
      role: 'admin',
      isActive: true,
    },
  })
}

async function main() {
  console.log('Ensuring at least one team membership for all users...')

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  })

  let created = 0
  for (const user of users) {
    const before = await prisma.teamMembership.count({ where: { userId: user.id, isActive: true } })
    if (before === 0) {
      await ensurePersonalTeamForUser(user.id, user.name, user.email)
      const after = await prisma.teamMembership.count({ where: { userId: user.id, isActive: true } })
      if (after > before) created += 1
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
      await (prisma as any).$disconnect?.()
    } catch {}
  })


