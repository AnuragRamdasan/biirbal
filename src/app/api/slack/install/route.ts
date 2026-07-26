import { NextRequest, NextResponse } from 'next/server'
import { WebClient } from '@slack/web-api'
import { getDbClient } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getBaseUrl } from '@/lib/config'
import { PRICING_PLANS } from '@/lib/stripe'
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
    
    if (!process.env.SLACK_CLIENT_ID || !process.env.SLACK_CLIENT_SECRET) {
      throw new Error('Slack OAuth is not configured')
    }
    
    const slackClient = new WebClient()
    
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

    try {
      const db = await getDbClient()

      const existingTeam = await db.team.findUnique({
        where: { slackTeamId: teamId },
        include: { users: true }
      })

      const isNewTeam = !existingTeam

      // FIX (Bug 2): provision new teams with correct free-plan defaults so
      // planId, monthlyLinkLimit, userLimit, and currentPeriodEnd are all set
      // correctly from day one. Previously this created a broken subscription
      // row with monthlyLinkLimit:10 and no planId/userLimit/currentPeriodEnd.
      const freePlan = PRICING_PLANS.FREE
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
              planId: freePlan.id,
              status: 'TRIAL',
              monthlyLinkLimit: freePlan.monthlyLinkLimit,
              userLimit: freePlan.userLimit,
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
          }
        }
      })

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

      if (userId && userAccessToken) {
        try {
          const userSlackClient = new WebClient(userAccessToken)
          const userInfo = await userSlackClient.users.info({ user: userId })

          if (userInfo.ok && userInfo.user) {
            let dbUser = null
            if (userInfo.user.profile?.email) {
              dbUser = await db.user.findUnique({
                where: { email: userInfo.user.profile.email },
                include: { memberships: true }
              })
            }

            if (!dbUser) {
              dbUser = await db.user.create({
                data: {
                  email: userInfo.user.profile?.email,
                  name: userInfo.user.name,
                  image: userInfo.user.profile?.image_192
                },
                include: { memberships: true }
              })
            }

            const existingMembership = await db.teamMembership.findUnique({
              where: {
                userId_teamId: {
                  userId: dbUser.id,
                  teamId: team.id
                }
              }
            })

            let userSeatAllowed = true
            if (!existingMembership) {
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

            await db.teamMembership.upsert({
              where: {
                userId_teamId: {
                  userId: dbUser.id,
                  teamId: team.id
                }
              },
              update: {
                slackUserId: userId,
                displayName: userInfo.user.profile?.display_name,
                realName: userInfo.user.profile?.real_name,
                profileImage24: userInfo.user.profile?.image_24,
                profileImage32: userInfo.user.profile?.image_32,
                profileImage48: userInfo.user.profile?.image_48,
                title: userInfo.user.profile?.title,
                userAccessToken,
                isActive: userSeatAllowed,
                updatedAt: new Date()
              },
              create: {
                userId: dbUser.id,
                teamId: team.id,
                slackUserId: userId,
                displayName: userInfo.user.profile?.display_name,
                realName: userInfo.user.profile?.real_name,
                profileImage24: userInfo.user.profile?.image_24,
                profileImage32: userInfo.user.profile?.image_32,
                profileImage48: userInfo.user.profile?.image_48,
                title: userInfo.user.profile?.title,
                userAccessToken,
                role: 'member',
                isActive: userSeatAllowed
              }
            })

            if (!existingMembership) {
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
