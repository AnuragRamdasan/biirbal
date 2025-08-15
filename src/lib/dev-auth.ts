import { prisma } from '@/lib/db'

// Development-only authentication bypass
// This allows automatic login for local development
export async function getDevUser() {
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  try {
    const firstUser = await prisma.user.findFirst({
      include: {
        memberships: {
          include: {
            team: {
              include: {
                subscription: true,
                channels: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return firstUser
  } catch {
    return null
  }
}

// Check if we're in development mode and should bypass auth
// Now checks URL parameters instead of environment variables
export function shouldBypassAuth(url?: URL | string): boolean {  
  if (process.env.NODE_ENV !== 'development') {
    return false
  }
  
  if (!url) {
    return false
  }
  
  const urlObj = typeof url === 'string' ? new URL(url) : url
  return urlObj.searchParams.get('dev') === 'true' || urlObj.searchParams.get('devLogin') === 'true'
}

// Get the current user (dev user in development, otherwise null)
export async function getCurrentUser(url?: URL | string) {
  if (shouldBypassAuth(url)) {
    return await getDevUser()
  }
  return null
}

// Development session data
export function createDevSession(user: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const firstMembership = user.memberships?.[0]
  const team = firstMembership?.team

  return {
    user: {
      id: user.id,
      dbUserId: user.id,
      email: user.email,
      name: user.name,
      displayName: firstMembership?.displayName || user.name,
      slackUserId: firstMembership?.slackUserId,
      teamId: team?.id,
      team: team,
      currentTeam: team,
      teams: user.memberships?.map((m: any) => m.team) || [], // eslint-disable-line @typescript-eslint/no-explicit-any
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  }
}