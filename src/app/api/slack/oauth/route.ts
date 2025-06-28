import { NextRequest, NextResponse } from 'next/server'
import { WebClient } from '@slack/web-api'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { handleApiError, ValidationError } from '@/lib/error-handler'

const slackClient = new WebClient()

export async function GET(request: NextRequest) {
  const oauthLogger = logger.child('slack-oauth')
  
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    oauthLogger.info('OAuth callback received', { 
      hasCode: !!code, 
      hasError: !!error,
      state 
    })

    if (error) {
      oauthLogger.warn('OAuth error received', { error })
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(error)}`, process.env.NEXTAUTH_URL || request.url)
      )
    }

    if (!code) {
      throw new ValidationError('Missing authorization code')
    }
    const result = await slackClient.oauth.v2.access({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code
    })

    if (!result.ok || !result.team || !result.access_token) {
      throw new Error('OAuth exchange failed')
    }

    const teamId = result.team.id!
    const teamName = result.team.name
    const accessToken = result.access_token
    const botUserId = result.bot_user_id

    await prisma.team.upsert({
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
            monthlyLimit: 50,
            linksProcessed: 0
          }
        }
      }
    })

    return NextResponse.redirect(
      new URL('/?installed=true', process.env.NEXTAUTH_URL || request.url)
    )
  } catch (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent('Installation failed')}`, process.env.NEXTAUTH_URL || request.url)
    )
  }
}