// Database interface types for type safety

export interface Team {
  id: string
  slackTeamId: string
  teamName?: string
  accessToken: string
  botUserId?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  slackUserId: string
  teamId: string
  name?: string
  displayName?: string
  realName?: string
  email?: string
  profileImage24?: string
  profileImage32?: string
  profileImage48?: string
  title?: string
  userAccessToken?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Channel {
  id: string
  slackChannelId: string
  channelName?: string
  teamId: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ProcessedLink {
  id: string
  url: string
  messageTs: string
  channelId: string
  teamId: string
  title?: string
  extractedText?: string
  audioFileUrl?: string
  audioFileKey?: string
  ttsScript?: string
  processingStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
}

export interface Subscription {
  id: string
  teamId: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED' | 'UNPAID'
  currentPeriodEnd?: Date
  linksProcessed: number
  monthlyLimit: number
  createdAt: Date
  updatedAt: Date
}

export interface AudioListen {
  id: string
  processedLinkId: string
  userId?: string
  slackUserId?: string
  userAgent?: string
  ipAddress?: string
  listenedAt: Date
  completed: boolean
  listenDuration?: number
}

// Composite types
export type TeamWithSubscription = Team & { subscription?: Subscription }