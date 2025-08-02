import { prisma } from '@/lib/db'

// Development-only authentication bypass
// This allows automatic login for local development
export async function getDevUser() {
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  try {
    const devUser = await prisma.user.findUnique({
      where: { email: 'dev@biirbal.com' },
      include: {
        team: {
          include: {
            subscription: true,
            channels: true,
          },
        },
      },
    })

    return devUser
  } catch (error) {
    console.error('Failed to get dev user:', error)
    return null
  }
}

// Check if we're in development mode and should bypass auth
export function shouldBypassAuth(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.DEV_AUTO_LOGIN === 'true'
}

// Get the current user (dev user in development, otherwise null)
export async function getCurrentUser() {
  if (shouldBypassAuth()) {
    return await getDevUser()
  }
  return null
}

// Development session data
export function createDevSession(user: any) {
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      displayName: user.displayName,
      slackUserId: user.slackUserId,
      teamId: user.teamId,
      team: user.team,
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  }
}