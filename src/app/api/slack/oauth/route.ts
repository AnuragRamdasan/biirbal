import { NextRequest, NextResponse } from 'next/server'
import { WebClient } from '@slack/web-api'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { handleApiError, ValidationError } from '@/lib/error-handler'

// Create WebClient only when needed, not at module level

export async function GET(request: NextRequest) {
  const oauthLogger = logger.child('slack-oauth')
  
  //try {
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
      console.log(process.env.NEXTAUTH_URL)
      console.log(request.url)
      console.log(error)
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(error)}`, process.env.NEXTAUTH_URL || request.url)
      )
    }

    if (!code) {
      throw new ValidationError('Missing authorization code')
    }
    
    // Check if Slack OAuth is configured
    if (!process.env.SLACK_CLIENT_ID || !process.env.SLACK_CLIENT_SECRET) {
      throw new Error('Slack OAuth is not configured')
    }
    
    // Create WebClient only when needed
    const slackClient = new WebClient()
    
    // Calculate the redirect URI - this MUST match what was used in the authorization request
    // TODO: Replace with your actual Vercel domain
    const redirectUri = process.env.NEXTAUTH_URL || 
                       process.env.NEXT_PUBLIC_BASE_URL || 
                       request.nextUrl.origin
    const fullRedirectUri = redirectUri.replace(/\/$/, '') + '/api/slack/oauth'
    
    console.log('Using redirect URI:', fullRedirectUri)
    
    const result = await slackClient.oauth.v2.access({
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: fullRedirectUri
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

    console.log(process.env.NEXTAUTH_URL)
    console.log(request.url)
    return NextResponse.redirect(
      new URL('/?installed=true', process.env.NEXTAUTH_URL || request.url)
    )
  // } catch (error) {
  //   console.error('OAuth error:', error)
  //   return NextResponse.redirect(
  //     new URL(`/?error=${encodeURIComponent('Installation failed')}`, process.env.NEXTAUTH_URL || request.url)
  //   )
  // }
}