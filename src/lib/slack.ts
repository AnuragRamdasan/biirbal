import { App } from '@slack/bolt'
import { WebClient } from '@slack/web-api'

export const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: false,
  customRoutes: []
})

export const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN)

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