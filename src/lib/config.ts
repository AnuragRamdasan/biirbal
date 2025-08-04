/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * Check if running in development environment
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV
}

/**
 * Get the base URL for the application
 * Uses NEXTAUTH_URL as the primary source of truth for the domain
 */
export function getBaseUrl(): string {
  // Use NEXTAUTH_URL as primary source (should be https://www.biirbal.com)
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL
  }
  
  // Fallback to NEXT_PUBLIC_BASE_URL if available
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL
  }
  
  // Environment-specific defaults
  if (isDevelopment()) {
    return 'http://localhost:3000'
  }
  
  if (isProduction()) {
    return 'https://www.biirbal.com'
  }
  
  // Final fallback to the correct domain
  return 'https://www.biirbal.com'
}


/**
 * Get the dashboard URL with optional link ID
 */
export function getDashboardUrl(linkId?: string): string {
  const baseUrl = getBaseUrl()
  return linkId ? `${baseUrl}/#${linkId}` : `${baseUrl}/`
}

/**
 * Get the Slack app installation URL
 */
export function getSlackInstallUrl(): string {
  if (!process.env.SLACK_CLIENT_ID || 
      process.env.SLACK_CLIENT_ID === 'dummy_client_id' ||
      !process.env.SLACK_CLIENT_SECRET ||
      process.env.SLACK_CLIENT_SECRET === 'dummy_client_secret') {
    throw new Error('Slack OAuth is not properly configured')
  }

  const baseUrl = getBaseUrl()
  const redirectUri = `${baseUrl}/api/slack/install`
  
  // Slack app installation requires these specific scopes for the bot
  const scopes = [
    'app_mentions:read',
    'channels:history',
    'channels:read', 
    'chat:write',
    'files:write',
    'groups:history',
    'groups:read',
    'im:history',
    'im:read',
    'mpim:history',
    'mpim:read',
    'incoming-webhook',
    'links.embed:write',
    'links:read',
    'team:read'
  ].join(',')

  // User scopes for getting user info
  const userScope = 'users:read'

  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID,
    scope: scopes,
    user_scope: userScope,
    redirect_uri: redirectUri,
  })

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`
}