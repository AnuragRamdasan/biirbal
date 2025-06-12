import { WebClient } from '@slack/web-api'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req, res) {
  // Validate required parameters
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code, state, error } = req.query

  // Handle OAuth errors from Slack
  if (error) {
    console.error('❌ OAuth error from Slack:', error)
    return res.redirect('/?error=' + encodeURIComponent(`Slack OAuth error: ${error}`))
  }

  if (!code) {
    return res.redirect('/?error=' + encodeURIComponent('Missing authorization code'))
  }

  // Validate environment variables
  const requiredEnvVars = ['SLACK_CLIENT_ID', 'SLACK_CLIENT_SECRET']
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ Missing environment variable: ${envVar}`)
      return res.redirect('/?error=' + encodeURIComponent(`Server configuration error: missing ${envVar}`))
    }
  }

  try {
    console.log('🔄 Processing OAuth callback...')

    // Exchange code for access token
    const client = new WebClient()
    const result = await client.oauth.v2.access({
      code,
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
    })

    console.log('✅ OAuth exchange successful for team:', result.team.name)

    // Validate OAuth response structure
    if (!result.team?.id || !result.access_token || !result.bot_user_id) {
      throw new Error('Invalid OAuth response structure')
    }

    // Prepare workspace data
    const workspaceData = {
      id: result.team.id,
      name: result.team.name,
      botId: result.bot_user_id,
      botToken: result.access_token,
      accessToken: result.authed_user?.access_token || null,
    }

    // Store/update workspace in database
    const workspace = await prisma.workspace.upsert({
      where: { id: result.team.id },
      update: {
        name: workspaceData.name,
        botId: workspaceData.botId,
        botToken: workspaceData.botToken,
        accessToken: workspaceData.accessToken,
      },
      create: workspaceData,
    })

    console.log(`✅ Workspace stored: ${workspace.name} (${workspace.id})`)

    // Test the bot token by getting bot info
    try {
      const botClient = new WebClient(result.access_token)
      const botInfo = await botClient.auth.test()
      console.log(`✅ Bot token validated: ${botInfo.user}`)
    } catch (tokenError) {
      console.error('⚠️ Warning: Bot token validation failed:', tokenError.message)
      // Continue anyway - token might still work for basic operations
    }

    // Set secure session cookies
    const cookieOptions = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}` // 30 days
    
    res.setHeader('Set-Cookie', [
      `workspaceId=${result.team.id}; ${cookieOptions}`,
      `workspaceName=${encodeURIComponent(result.team.name)}; ${cookieOptions}`,
    ])

    // Redirect to dashboard with success message
    res.redirect('/dashboard?success=' + encodeURIComponent('Slack integration successful!'))

  } catch (error) {
    console.error('❌ OAuth error:', error)
    
    // Provide helpful error messages
    let errorMessage = 'OAuth failed'
    
    if (error.code === 'invalid_code') {
      errorMessage = 'Authorization code expired or invalid. Please try again.'
    } else if (error.code === 'access_denied') {
      errorMessage = 'Access denied. Please approve the Slack integration to continue.'
    } else if (error.message?.includes('network')) {
      errorMessage = 'Network error. Please check your connection and try again.'
    } else if (error.message) {
      errorMessage = error.message
    }

    res.redirect('/?error=' + encodeURIComponent(errorMessage))
  }
}
