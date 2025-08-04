import { NextRequest, NextResponse } from 'next/server'
import { WebClient } from '@slack/web-api'
import { getDbClient } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getBaseUrl } from '@/lib/config'
import { canAddNewUser } from '@/lib/subscription-utils'
import { adminNotifications } from '@/lib/admin-notifications'

export async function GET(request: NextRequest) {
  const installLogger = logger.child('slack-install')
  
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    installLogger.info('Slack app install callback received', { 
      hasCode: !!code, 
      hasError: !!error,
      state 
    })

    if (error) {
      installLogger.warn('Slack install error received', { error })
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent('Slack installation was cancelled or failed')}`, getBaseUrl())
      )
    }

    if (!code) {
      return NextResponse.json(
        { error: 'Missing authorization code' },
        { status: 400 }
      )
    }
    
    // Check if Slack OAuth is configured
    if (!process.env.SLACK_CLIENT_ID || !process.env.SLACK_CLIENT_SECRET) {
      throw new Error('Slack OAuth is not configured')
    }
    
    // Create WebClient for OAuth exchange
    const slackClient = new WebClient()
    
    // Exchange code for tokens
    const result = await slackClient.oauth.v2.access({
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: `${getBaseUrl()}/api/slack/install`
    })

    if (!result.ok || !result.team || !result.access_token) {
      throw new Error('Slack app installation failed')
    }

    const teamId = result.team.id!
    const teamName = result.team.name
    const accessToken = result.access_token
    const botUserId = result.bot_user_id
    
    // Extract user information from install result
    const userId = result.authed_user?.id
    const userAccessToken = result.authed_user?.access_token

    installLogger.info('Slack app installed successfully', {
      teamId,
      teamName,
      botUserId,
      userId,
      hasAccessToken: !!accessToken,
      hasUserToken: !!userAccessToken
    })

    // Store team and user information in database
    try {
      const db = await getDbClient()

      // Check if this is a new team
      const existingTeam = await db.team.findUnique({
        where: { slackTeamId: teamId },
        include: { users: true }
      })

      const isNewTeam = !existingTeam

      // Create or update team
      const team = await db.team.upsert({
        where: { slackTeamId: teamId },
        update: {
          teamName,
          accessToken,
          botUserId,
          isActive: true,
          updatedAt: new Date()
        },
        create: {
          slackTeamId: teamId,
          teamName,
          accessToken,
          botUserId,
          isActive: true,
          subscription: {
            create: {
              status: 'TRIAL',
              monthlyLinkLimit: 10
            }
          }
        }
      })

      // Send admin notification for new team signup
      if (isNewTeam) {
        try {
          await adminNotifications.notifyTeamSignup({
            teamId: team.id,
            teamName: teamName || undefined,
            slackTeamId: teamId,
            userCount: 1,
            installationType: 'app_install'
          })
        } catch (error) {
          installLogger.error('Failed to send team signup notification', { error })
        }
      }

      // Handle user creation/update if user info is available
      if (userId && userAccessToken) {
        try {
          const existingUser = await db.user.findUnique({
            where: { slackUserId: userId }
          })

          let userSeatAllowed = true
          if (!existingUser) {
            const canAdd = await canAddNewUser(teamId)
            if (!canAdd.allowed) {
              installLogger.warn('Cannot add new user due to seat limit', { 
                teamId, 
                userId, 
                reason: canAdd.reason 
              })
              userSeatAllowed = false
            }
          }

          // Get user info from Slack
          const userSlackClient = new WebClient(userAccessToken)
          const userInfo = await userSlackClient.users.info({ user: userId })

          if (userInfo.ok && userInfo.user) {
            const isNewUser = !existingUser

            await db.user.upsert({
              where: { slackUserId: userId },
              update: {
                teamId: team.id,
                name: userInfo.user.name,
                displayName: userInfo.user.profile?.display_name,
                realName: userInfo.user.profile?.real_name,
                email: userInfo.user.profile?.email,
                profileImage24: userInfo.user.profile?.image_24,
                profileImage32: userInfo.user.profile?.image_32,
                profileImage48: userInfo.user.profile?.image_48,
                title: userInfo.user.profile?.title,
                userAccessToken,
                isActive: userSeatAllowed,
                updatedAt: new Date()
              },
              create: {
                slackUserId: userId,
                teamId: team.id,
                name: userInfo.user.name,
                displayName: userInfo.user.profile?.display_name,
                realName: userInfo.user.profile?.real_name,
                email: userInfo.user.profile?.email,
                profileImage24: userInfo.user.profile?.image_24,
                profileImage32: userInfo.user.profile?.image_32,
                profileImage48: userInfo.user.profile?.image_48,
                title: userInfo.user.profile?.title,
                userAccessToken,
                isActive: userSeatAllowed
              }
            })

            // Send user signup notification for new users
            if (isNewUser) {
              try {
                await adminNotifications.notifyUserSignup({
                  userId,
                  userName: userInfo.user.name || undefined,
                  userEmail: userInfo.user.profile?.email || undefined,
                  teamId,
                  teamName: teamName || undefined,
                  source: 'slack_app_install'
                })
              } catch (error) {
                installLogger.error('Failed to send user signup notification', { error })
              }
            }
          }
        } catch (error) {
          installLogger.error('Failed to fetch/store user info during install', { error })
        }
      }
    } catch (persistError) {
      installLogger.error('Error persisting Slack install data', { persistError })
    }
    
    // Redirect to success page
    return NextResponse.redirect(
      new URL('/?installed=true&source=slack', getBaseUrl())
    )
  } catch (error) {
    installLogger.error('Slack app installation error', { error })
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent('Slack app installation failed')}`, getBaseUrl())
    )
  }
}