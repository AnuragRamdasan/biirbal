import { NextRequest, NextResponse } from 'next/server'
import { WebClient } from '@slack/web-api'
import { getDbClient } from '@/lib/db'
import { logger } from '@/lib/logger'
import { ValidationError } from '@/lib/error-handler'
import { getBaseUrl, getOAuthRedirectUri } from '@/lib/config'
import { canAddNewUser } from '@/lib/subscription-utils'

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
        new URL(`/?error=${encodeURIComponent(error)}`, getBaseUrl())
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
    
    // Use configured domain for OAuth redirect
    const fullRedirectUri = getOAuthRedirectUri()
    
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
      scopes: result.scope || 'No scopes returned',
      fullResult: result // Log the full result to see what user info is available
    })

    // Extract user information from OAuth result
    const userId = result.authed_user?.id
    const userAccessToken = result.authed_user?.access_token
    
    console.log('User info from OAuth:', {
      userId,
      hasUserToken: !!userAccessToken,
      authedUser: result.authed_user
    })

    // Store team information
    const db = await getDbClient()
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
            monthlyLinkLimit: 10,
            linksProcessed: 0
          }
        }
      }
    })

    // Store user information if available
    if (userId && userAccessToken) {
      try {
        // Check if existing user or if we can add a new user
        const existingUser = await db.user.findUnique({
          where: { slackUserId: userId }
        })
        
        let userSeatAllowed = true
        let userAccessDisabled = false
        
        if (!existingUser) {
          // Check if we can add a new user
          const canAdd = await canAddNewUser(teamId)
          if (!canAdd.allowed) {
            console.log('Cannot add new user due to seat limit:', canAdd.reason)
            userSeatAllowed = false
            userAccessDisabled = true
          }
        }
        
        // Use the user access token to get detailed user info
        const userSlackClient = new WebClient(userAccessToken)
        const userInfo = await userSlackClient.users.info({ user: userId })
        
        if (userInfo.ok && userInfo.user) {
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
              isActive: userSeatAllowed, // Disable if over seat limit
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
              isActive: userSeatAllowed // Disable if over seat limit
            }
          })
          
          console.log('User information stored:', {
            userId,
            name: userInfo.user.name,
            email: userInfo.user.profile?.email,
            isActive: userSeatAllowed,
            accessDisabled: userAccessDisabled
          })
        }
      } catch (error) {
        console.error('Failed to fetch/store user info:', error)
        // Don't fail the OAuth flow if user info fails
      }
    }

    console.log(process.env.NEXTAUTH_URL)
    console.log(request.url)
    
    // Store team ID and user ID in URL for client-side storage
    // Use Slack team ID (teamId) for profile API compatibility
    let redirectUrl = `/?installed=true&teamId=${encodeURIComponent(teamId)}`
    if (userId) {
      redirectUrl += `&userId=${encodeURIComponent(userId)}`
    }
    
    return NextResponse.redirect(
      new URL(redirectUrl, getBaseUrl())
    )
  } catch (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent('Installation failed')}`, getBaseUrl())
    )
  }
}