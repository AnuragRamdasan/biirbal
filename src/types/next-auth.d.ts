import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      dbUserId: string
      name?: string | null
      email?: string | null
      image?: string | null
      
      // Current active team (backward compatibility)
      teamId?: string
      team?: {
        id: string
        name: string
        subscription?: any
      }
      currentTeam?: {
        id: string
        name: string
        slackTeamId?: string | null
        role: string
        isSlackTeam: boolean
        subscription?: any
      }
      
      // All user's teams
      teams?: Array<{
        id: string
        name: string
        slackTeamId?: string | null
        role: string
        isSlackTeam: boolean
        subscription?: any
        membership: {
          id: string
          slackUserId?: string | null
          displayName?: string | null
          realName?: string | null
          profileImage24?: string | null
          isActive: boolean
          role: string
        }
      }>
      
      // Slack-specific fields (for backward compatibility)
      slackUserId?: string | null
    }
  }

  interface User {
    id: string
    dbUserId?: string
    name?: string | null
    email?: string | null
    image?: string | null
    teamId?: string
    team?: {
      id: string
      name: string
      subscription?: any
    }
    teams?: Array<{
      id: string
      name: string
      slackTeamId?: string | null
      role: string
      isSlackTeam: boolean
      subscription?: any
    }>
    slackUserId?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    dbUserId?: string
    teamId?: string
    teams?: Array<{
      id: string
      name: string
      slackTeamId?: string | null
      role: string
      isSlackTeam: boolean
      subscription?: any
    }>
    slackUserId?: string | null
  }
}