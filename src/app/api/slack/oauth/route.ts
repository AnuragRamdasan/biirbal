import { NextRequest, NextResponse } from 'next/server'
import { WebClient } from '@slack/web-api'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { handleApiError, ValidationError } from '@/lib/error-handler'

// Create WebClient only when needed, not at module level

export async function GET(request: NextRequest) {
  console.log(process.env.NEXTAUTH_URL)
  console.log(process.env.NEXT_PUBLIC_BASE_URL)
  console.log(request.url)
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
      console.log(process.env.NEXTAUTH_URL)
      console.log(request.url)
      console.log(error)
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(error)}`, 'https://biirbal.com')
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
    const host = request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    
    // Force custom domain for OAuth redirect - never use Vercel preview URLs
    const fullRedirectUri = 'https://biirbal.com/api/slack/oauth'
    
    console.log('Debug redirect URI info:', {
      host,
      protocol,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      finalRedirectUri: fullRedirectUri
    })
    
    // Try without redirect_uri first to see what Slack expects
    let result: any
    try {
      result = await slackClient.oauth.v2.access({
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: fullRedirectUri
      })
      
      console.log('OAuth success with redirect_uri:', fullRedirectUri)
    } catch (error: any) {
      console.log('OAuth failed with redirect_uri:', fullRedirectUri)
      console.log('Error details:', error.data)
      
      // Try again without redirect_uri to see if Slack gives us more info
      try {
        result = await slackClient.oauth.v2.access({
          client_id: process.env.SLACK_CLIENT_ID,
          client_secret: process.env.SLACK_CLIENT_SECRET,
          code
        })
        console.log('OAuth success WITHOUT redirect_uri')
      } catch (error2: any) {
        console.log('OAuth failed without redirect_uri:', error2.data)
        throw error // Throw original error
      }
    }

    if (!result.ok || !result.team || !result.access_token) {
      throw new Error('OAuth exchange failed')
    }

    const teamId = result.team.id!
    const teamName = result.team.name
    const accessToken = result.access_token
    const botUserId = result.bot_user_id
    
    console.log('OAuth result details:', {
      teamId,
      teamName,
      botUserId,
      hasAccessToken: !!accessToken,
      tokenType: typeof accessToken,
      scopes: result.scope || 'No scopes returned'
    })

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
    
    // Store team ID in URL for client-side storage
    return NextResponse.redirect(
      new URL(`/?installed=true&teamId=${encodeURIComponent(teamId)}`, 'https://biirbal.com')
    )
  } catch (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent('Installation failed')}`, 'https://biirbal.com')
    )
  }
}