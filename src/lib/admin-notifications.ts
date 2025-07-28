import { WebClient } from '@slack/web-api'

// Admin Slack configuration
const ADMIN_SLACK_TOKEN = process.env.ADMIN_SLACK_TOKEN
const ADMIN_SUBSCRIPTION_CHANNEL = process.env.ADMIN_SUBSCRIPTION_CHANNEL || '#biirbal-subscriptions'
const ADMIN_TEAM_CHANNEL = process.env.ADMIN_TEAM_CHANNEL || '#biirbal-teams'
const ADMIN_USER_CHANNEL = process.env.ADMIN_USER_CHANNEL || '#biirbal-users'

interface BaseNotificationData {
  event: string
  timestamp: string
  environment?: string
}

interface UserSignupData extends BaseNotificationData {
  event: 'user_signup'
  userId: string
  userName?: string
  userEmail?: string
  teamId: string
  teamName?: string
  source: 'slack_oauth' | 'email_signup'
}

interface TeamSignupData extends BaseNotificationData {
  event: 'team_signup'
  teamId: string
  teamName?: string
  slackTeamId: string
  userCount: number
  installationType: 'new' | 'reinstall'
}

interface SubscriptionEventData extends BaseNotificationData {
  event: 'subscription_started' | 'subscription_upgraded' | 'subscription_downgraded' | 'subscription_cancelled' | 'subscription_payment'
  teamId: string
  teamName?: string
  planId: string
  planName: string
  previousPlan?: string
  amount?: number
  currency?: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
}

interface UserInvitationData extends BaseNotificationData {
  event: 'user_invited' | 'user_removed'
  teamId: string
  teamName?: string
  email: string
  invitedBy?: string
  invitedByName?: string
}

interface TeamDeletionData extends BaseNotificationData {
  event: 'team_deleted'
  teamId: string
  teamName?: string
  deletedBy?: string
  reason?: string
}

type AdminNotificationData = UserSignupData | TeamSignupData | SubscriptionEventData | UserInvitationData | TeamDeletionData

class AdminNotificationService {
  private slackClient: WebClient | null = null

  constructor() {
    if (ADMIN_SLACK_TOKEN) {
      this.slackClient = new WebClient(ADMIN_SLACK_TOKEN)
    } else {
      console.warn('⚠️ ADMIN_SLACK_TOKEN not configured - admin notifications disabled')
    }
  }

  async sendNotification(data: AdminNotificationData): Promise<void> {
    if (!this.slackClient) {
      console.log('📢 Admin notification (no Slack configured):', data)
      return
    }

    try {
      const message = this.formatMessage(data)
      const blocks = this.formatBlocks(data)
      const channel = this.getChannelForEvent(data.event)

      await this.slackClient.chat.postMessage({
        channel,
        text: message,
        blocks,
        username: 'Biirbal Admin Bot',
        icon_emoji: ':robot_face:'
      })

      console.log('✅ Admin notification sent:', data.event, 'to', channel)
    } catch (error) {
      console.error('❌ Failed to send admin notification:', error)
    }
  }

  private getChannelForEvent(event: string): string {
    // Subscription events
    if (event.startsWith('subscription_')) {
      return ADMIN_SUBSCRIPTION_CHANNEL
    }
    
    // Team events
    if (event === 'team_signup' || event === 'team_deleted') {
      return ADMIN_TEAM_CHANNEL
    }
    
    // User events
    if (event === 'user_signup' || event === 'user_invited' || event === 'user_removed') {
      return ADMIN_USER_CHANNEL
    }
    
    // Default to team channel
    return ADMIN_TEAM_CHANNEL
  }

  private formatMessage(data: AdminNotificationData): string {
    const env = data.environment ? `[${data.environment.toUpperCase()}] ` : ''
    
    switch (data.event) {
      case 'user_signup':
        return `${env}👤 New user signup: ${data.userName || data.userId} joined team ${data.teamName || data.teamId}`
      
      case 'team_signup':
        return `${env}🏢 New team signup: ${data.teamName || data.teamId} (${data.userCount} users)`
      
      case 'subscription_started':
        return `${env}💳 New subscription: ${data.teamName || data.teamId} started ${data.planName} plan`
      
      case 'subscription_upgraded':
        return `${env}⬆️ Subscription upgrade: ${data.teamName || data.teamId} upgraded to ${data.planName}`
      
      case 'subscription_downgraded':
        return `${env}⬇️ Subscription downgrade: ${data.teamName || data.teamId} downgraded to ${data.planName}`
      
      case 'subscription_cancelled':
        return `${env}❌ Subscription cancelled: ${data.teamName || data.teamId} cancelled ${data.planName} plan`
      
      case 'subscription_payment':
        return `${env}💰 Payment received: ${data.teamName || data.teamId} paid $${data.amount} for ${data.planName}`
      
      case 'user_invited':
        return `${env}📧 User invited: ${data.email} invited to team ${data.teamName || data.teamId}`
      
      case 'user_removed':
        return `${env}🚫 User removed: ${data.email} removed from team ${data.teamName || data.teamId}`
      
      case 'team_deleted':
        return `${env}🗑️ Team deleted: ${data.teamName || data.teamId} was deleted`
      
      default:
        return `${env}📊 Admin event: ${data.event}`
    }
  }

  private formatBlocks(data: AdminNotificationData): any[] {
    const env = data.environment ? `*Environment:* ${data.environment.toUpperCase()}\n` : ''
    const timestamp = `*Time:* ${new Date(data.timestamp).toLocaleString()}\n`
    
    let fields: any[] = []
    let color = '#36a64f' // Default green
    let emoji = '📊'

    switch (data.event) {
      case 'user_signup':
        emoji = '👤'
        color = '#36a64f'
        fields = [
          {
            type: 'mrkdwn',
            text: `*User:* ${data.userName || 'Unknown'}\n*Email:* ${data.userEmail || 'N/A'}`
          },
          {
            type: 'mrkdwn',
            text: `*Team:* ${data.teamName || data.teamId}\n*Source:* ${data.source}`
          }
        ]
        break

      case 'team_signup':
        emoji = '🏢'
        color = '#36a64f'
        fields = [
          {
            type: 'mrkdwn',
            text: `*Team:* ${data.teamName || 'Unknown'}\n*Slack Team ID:* ${data.slackTeamId}`
          },
          {
            type: 'mrkdwn',
            text: `*Users:* ${data.userCount}\n*Type:* ${data.installationType}`
          }
        ]
        break

      case 'subscription_started':
        emoji = '💳'
        color = '#36a64f'
        fields = [
          {
            type: 'mrkdwn',
            text: `*Team:* ${data.teamName || data.teamId}\n*Plan:* ${data.planName}`
          },
          {
            type: 'mrkdwn',
            text: `*Amount:* $${data.amount || 'N/A'}\n*Stripe ID:* ${data.stripeSubscriptionId || 'N/A'}`
          }
        ]
        break

      case 'subscription_upgraded':
        emoji = '⬆️'
        color = '#36a64f'
        fields = [
          {
            type: 'mrkdwn',
            text: `*Team:* ${data.teamName || data.teamId}\n*New Plan:* ${data.planName}`
          },
          {
            type: 'mrkdwn',
            text: `*Previous:* ${data.previousPlan || 'N/A'}\n*Amount:* $${data.amount || 'N/A'}`
          }
        ]
        break

      case 'subscription_downgraded':
        emoji = '⬇️'
        color = '#ff9500'
        fields = [
          {
            type: 'mrkdwn',
            text: `*Team:* ${data.teamName || data.teamId}\n*New Plan:* ${data.planName}`
          },
          {
            type: 'mrkdwn',
            text: `*Previous:* ${data.previousPlan || 'N/A'}\n*Amount:* $${data.amount || 'N/A'}`
          }
        ]
        break

      case 'subscription_cancelled':
        emoji = '❌'
        color = '#ff0000'
        fields = [
          {
            type: 'mrkdwn',
            text: `*Team:* ${data.teamName || data.teamId}\n*Cancelled Plan:* ${data.planName}`
          },
          {
            type: 'mrkdwn',
            text: `*Stripe ID:* ${data.stripeSubscriptionId || 'N/A'}\n*Customer ID:* ${data.stripeCustomerId || 'N/A'}`
          }
        ]
        break

      case 'subscription_payment':
        emoji = '💰'
        color = '#36a64f'
        fields = [
          {
            type: 'mrkdwn',
            text: `*Team:* ${data.teamName || data.teamId}\n*Plan:* ${data.planName}`
          },
          {
            type: 'mrkdwn',
            text: `*Amount:* $${data.amount} ${data.currency || 'USD'}\n*Customer:* ${data.stripeCustomerId || 'N/A'}`
          }
        ]
        break

      case 'user_invited':
        emoji = '📧'
        color = '#36a64f'
        fields = [
          {
            type: 'mrkdwn',
            text: `*Email:* ${data.email}\n*Team:* ${data.teamName || data.teamId}`
          },
          {
            type: 'mrkdwn',
            text: `*Invited By:* ${data.invitedByName || data.invitedBy || 'Unknown'}\n*Status:* Invitation Sent`
          }
        ]
        break

      case 'user_removed':
        emoji = '🚫'
        color = '#ff9500'
        fields = [
          {
            type: 'mrkdwn',
            text: `*Email:* ${data.email}\n*Team:* ${data.teamName || data.teamId}`
          },
          {
            type: 'mrkdwn',
            text: `*Removed By:* ${data.invitedByName || data.invitedBy || 'Unknown'}\n*Status:* User Removed`
          }
        ]
        break

      case 'team_deleted':
        emoji = '🗑️'
        color = '#ff0000'
        fields = [
          {
            type: 'mrkdwn',
            text: `*Team:* ${data.teamName || data.teamId}\n*Deleted By:* ${data.deletedBy || 'Unknown'}`
          },
          {
            type: 'mrkdwn',
            text: `*Reason:* ${data.reason || 'Not specified'}\n*Status:* Permanently Deleted`
          }
        ]
        break
    }

    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${emoji} *${this.getEventTitle(data.event)}*\n${env}${timestamp}`
        }
      },
      ...(fields.length > 0 ? [{
        type: 'section',
        fields
      }] : []),
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Event ID: \`${data.event}_${Date.now()}\``
          }
        ]
      }
    ]
  }

  private getEventTitle(event: string): string {
    const titles: Record<string, string> = {
      'user_signup': 'New User Signup',
      'team_signup': 'New Team Signup',
      'subscription_started': 'Subscription Started',
      'subscription_upgraded': 'Subscription Upgraded',
      'subscription_downgraded': 'Subscription Downgraded',
      'subscription_cancelled': 'Subscription Cancelled',
      'subscription_payment': 'Payment Received',
      'user_invited': 'User Invited',
      'user_removed': 'User Removed',
      'team_deleted': 'Team Deleted'
    }
    return titles[event] || event
  }

  // Helper methods for easy use
  async notifyUserSignup(data: Omit<UserSignupData, 'event' | 'timestamp'>): Promise<void> {
    return this.sendNotification({
      ...data,
      event: 'user_signup',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    })
  }

  async notifyTeamSignup(data: Omit<TeamSignupData, 'event' | 'timestamp'>): Promise<void> {
    return this.sendNotification({
      ...data,
      event: 'team_signup',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    })
  }

  async notifySubscriptionEvent(data: Omit<SubscriptionEventData, 'timestamp'>): Promise<void> {
    return this.sendNotification({
      ...data,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    })
  }

  async notifyUserInvited(data: Omit<UserInvitationData, 'event' | 'timestamp'>): Promise<void> {
    return this.sendNotification({
      ...data,
      event: 'user_invited',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    })
  }

  async notifyUserRemoved(data: Omit<UserInvitationData, 'event' | 'timestamp'>): Promise<void> {
    return this.sendNotification({
      ...data,
      event: 'user_removed',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    })
  }

  async notifyTeamDeleted(data: Omit<TeamDeletionData, 'event' | 'timestamp'>): Promise<void> {
    return this.sendNotification({
      ...data,
      event: 'team_deleted',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    })
  }
}

// Export singleton instance
export const adminNotifications = new AdminNotificationService()

// Export types for use in other files
export type {
  UserSignupData,
  TeamSignupData,
  SubscriptionEventData,
  UserInvitationData,
  TeamDeletionData,
  AdminNotificationData
}