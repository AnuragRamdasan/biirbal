import { App } from '@slack/bolt'
import { WebClient } from '@slack/web-api'

// Initialize Slack App only if required environment variables are available
function createSlackApp() {
  if (!process.env.SLACK_SIGNING_SECRET) {
    return null
  }

  // For OAuth apps, we need client credentials instead of bot token
  if (process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET) {
    return new App({
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      clientId: process.env.SLACK_CLIENT_ID,
      clientSecret: process.env.SLACK_CLIENT_SECRET,
      stateSecret: process.env.SLACK_STATE_SECRET || 'default-state-secret',
      socketMode: false,
      customRoutes: [],
      installationStore: {
        storeInstallation: async (installation) => {
          // Store installation in database
          console.log('Storing installation:', installation)
        },
        fetchInstallation: async (installQuery) => {
          // Fetch installation from database
          console.log('Fetching installation:', installQuery)
          return null
        },
        deleteInstallation: async (installQuery) => {
          // Delete installation from database
          console.log('Deleting installation:', installQuery)
        }
      }
    })
  }

  // For single workspace apps with bot token
  if (process.env.SLACK_BOT_TOKEN) {
    return new App({
      token: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      appToken: process.env.SLACK_APP_TOKEN,
      socketMode: false,
      customRoutes: []
    })
  }

  return null
}

function createSlackClient() {
  if (!process.env.SLACK_BOT_TOKEN) {
    return null
  }
  return new WebClient(process.env.SLACK_BOT_TOKEN)
}

export const slackApp = createSlackApp()
export const slackClient = createSlackClient()

export const extractLinksFromMessage = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s<>]+)/gi
  const matches = text.match(urlRegex)
  return matches || []
}

export const isValidUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
  } catch {
    return false
  }
}

export const shouldProcessUrl = (url: string): boolean => {
  const excludedDomains = [
    'slack.com',
    'slack-files.com',
    'slack-imgs.com',
    'localhost'
  ]
  
  try {
    const parsedUrl = new URL(url)
    return !excludedDomains.some(domain => parsedUrl.hostname.includes(domain))
  } catch {
    return false
  }
}