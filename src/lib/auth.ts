import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import EmailProvider from "next-auth/providers/email"
import { emailService } from "@/lib/email-service"
import { prisma } from "@/lib/db"
import { WebClient } from '@slack/web-api'
import { canAddNewUser } from '@/lib/subscription-utils'
import { adminNotifications } from '@/lib/admin-notifications'


// Use the unified database client for NextAuth
console.log('🔧 Setting up NextAuth with unified database client...')

// Create custom adapter that truly allows email linking
const customAdapter = PrismaAdapter(prisma)

// Override getUserByEmail to never throw on existing users
const originalGetUserByEmail = customAdapter.getUserByEmail!
customAdapter.getUserByEmail = async (email: string) => {
  try {
    return await originalGetUserByEmail(email)
  } catch (error) {
    // If user exists but with different provider, return null to allow linking
    console.log(`🔗 Allowing account linking for email: ${email}`)
    return null
  }
}

// Override linkAccount to handle Slack OAuth response properly
const originalLinkAccount = customAdapter.linkAccount!
customAdapter.linkAccount = async (account) => {
  console.log('🔗 LinkAccount called with:', { provider: account.provider, type: account.type })
  
  // For Slack, only save the standard OAuth fields to avoid Prisma validation errors
  if (account.provider === 'slack') {
    const cleanAccount = {
      userId: account.userId,
      type: account.type,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      // Only include standard OAuth fields that exist in Account schema
      access_token: account.access_token,
      refresh_token: account.refresh_token || null,
      expires_at: account.expires_at || null,
      token_type: account.token_type || 'bearer',
      scope: account.scope || null,
      id_token: account.id_token || null,
      session_state: account.session_state || null,
    }
    
    console.log('🔗 Saving cleaned Slack account data:', {
      provider: cleanAccount.provider,
      userId: cleanAccount.userId,
      hasAccessToken: !!cleanAccount.access_token
    })
    
    return await originalLinkAccount(cleanAccount)
  }
  
  // For other providers, use original behavior
  return await originalLinkAccount(account)
}

export const authOptions: NextAuthOptions = {
  adapter: customAdapter,
  debug: process.env.NODE_ENV === 'development',
  // Allow users to sign in with different providers using the same email
  allowDangerousEmailAccountLinking: true,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // Only include Slack provider if real credentials are configured (not dummy values)
    ...(process.env.SLACK_CLIENT_ID && 
        process.env.SLACK_CLIENT_SECRET && 
        process.env.SLACK_CLIENT_ID !== 'dummy_client_id' &&
        process.env.SLACK_CLIENT_SECRET !== 'dummy_client_secret' ? [{
      id: "slack",
      name: "Slack",
      type: "oauth",
      clientId: process.env.SLACK_CLIENT_ID,
      clientSecret: process.env.SLACK_CLIENT_SECRET,
      authorization: {
        url: "https://slack.com/oauth/v2/authorize",
        params: {
          scope: "app_mentions:read,channels:history,channels:read,chat:write,files:write,groups:history,groups:read,im:history,im:read,mpim:history,mpim:read",
          user_scope: "users:read",
        },
      },
      token: "https://slack.com/api/oauth.v2.access",
      userinfo: {
        async request({ tokens, client, provider }) {
          console.log('🔍 Slack userinfo request:', {
            hasAccessToken: !!tokens.access_token,
            hasAuthedUser: !!tokens.authed_user,
            userId: tokens.authed_user?.id,
            teamId: tokens.team?.id,
            botUserId: tokens.bot_user_id
          })

          // Use the user access token to get user info
          const userAccessToken = tokens.authed_user?.access_token || tokens.access_token
          const userClient = new WebClient(userAccessToken)
          
          const userInfo = await userClient.users.info({ 
            user: tokens.authed_user?.id 
          })
          
          if (!userInfo.ok || !userInfo.user) {
            throw new Error('Failed to fetch user info from Slack')
          }

          return {
            id: userInfo.user.id,
            name: userInfo.user.name,
            email: userInfo.user.profile?.email,
            image: userInfo.user.profile?.image_192,
            // Store additional Slack data we need
            slackUserId: userInfo.user.id,
            slackTeamId: tokens.team?.id,
            teamName: tokens.team?.name,
            userAccessToken: tokens.authed_user?.access_token,
            teamAccessToken: tokens.access_token, // Bot token
            botUserId: tokens.bot_user_id,
            displayName: userInfo.user.profile?.display_name,
            realName: userInfo.user.profile?.real_name,
            profileImage24: userInfo.user.profile?.image_24,
            profileImage32: userInfo.user.profile?.image_32,
            profileImage48: userInfo.user.profile?.image_48,
            title: userInfo.user.profile?.title,
          }
        },
      },
      profile(profile) {
        return {
          id: profile.slackUserId,
          name: profile.name,
          email: profile.email,
          image: profile.image,
        }
      },
    }] : []),
    EmailProvider({
      from: process.env.FROM_EMAIL || 'noreply@biirbal.com',
      sendVerificationRequest: async ({ identifier: email, url }) => {
        await emailService.sendEmail({
          to: email,
          subject: "Sign in to Biirbal.ai",
          html: `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Sign in to Biirbal</title>
  <style type="text/css">
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    table { border-collapse: collapse; width: 100%; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
    .logo { font-size: 36px; color: #ffffff; margin-bottom: 10px; text-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header-title { font-size: 24px; color: #ffffff; margin: 0; font-weight: 600; }
    .content { padding: 40px 30px; }
    .greeting { font-size: 18px; color: #2d3748; margin-bottom: 24px; font-weight: 500; }
    .signin-text { font-size: 16px; color: #4a5568; line-height: 1.6; margin-bottom: 24px; }
    .cta-container { text-align: center; margin: 32px 0; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(24, 144, 255, 0.3); }
    .backup-link { background-color: #f7fafc; padding: 16px; border-radius: 6px; margin: 24px 0; }
    .backup-link-text { font-size: 14px; color: #4a5568; margin-bottom: 8px; }
    .backup-url { font-size: 12px; color: #718096; word-break: break-all; background-color: #ffffff; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0; }
    .footer { background-color: #f7fafc; padding: 24px 30px; border-top: 1px solid #e2e8f0; }
    .footer-text { font-size: 12px; color: #718096; text-align: center; line-height: 1.5; margin: 0; }
    @media only screen and (max-width: 600px) {
      .content { padding: 24px 20px; }
      .header { padding: 32px 20px; }
      .cta-button { padding: 14px 24px; font-size: 15px; }
    }
  </style>
</head>
<body>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td>
        <div class="email-container">
          <div class="header">
            <div class="logo">🎧 Biirbal</div>
            <h1 class="header-title">Sign in to your account</h1>
          </div>
          
          <div class="content">
            <div class="greeting">Hello!</div>
            
            <div class="signin-text">
              Click the button below to sign in to your Biirbal account:
            </div>
            
            <div class="cta-container">
              <a href="${url}" class="cta-button">Sign In</a>
            </div>
            
            <div class="backup-link">
              <div class="backup-link-text">If the button doesn't work, copy and paste this link into your browser:</div>
              <div class="backup-url">${url}</div>
            </div>
          </div>
          
          <div class="footer">
            <p class="footer-text">
              This sign-in link was sent to ${email}. If you didn't request this, you can safely ignore this email.<br><br>
              © 2025 Biirbal. All rights reserved.
            </p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
          `,
        })
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log(`🔐 Sign in attempt: ${user.email} via ${account?.provider}`)
      
      // Handle Slack OAuth team and user creation
      if (account?.provider === 'slack' && profile) {
        try {
          const slackProfile = profile as any
          const teamId = slackProfile.slackTeamId
          const teamName = slackProfile.teamName
          const accessToken = slackProfile.teamAccessToken
          const botUserId = slackProfile.botUserId
          const userId = slackProfile.slackUserId
          const userAccessToken = slackProfile.userAccessToken

          console.log('🏢 Processing Slack OAuth:', {
            teamId,
            teamName,
            userId,
            hasAccessToken: !!accessToken,
            hasBotUserId: !!botUserId
          })

          // Check if this is a new team
          const existingTeam = await prisma.team.findUnique({
            where: { slackTeamId: teamId },
            include: { memberships: true }
          })

          const isNewTeam = !existingTeam

          // Create or update team
          const team = await prisma.team.upsert({
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
                  monthlyLinkLimit: 10
                }
              }
            }
          })

          // Send admin notification for new team signup
          if (isNewTeam) {
            try {
              await adminNotifications.notifyTeamSignup({
                teamId: team.id,
                teamName: teamName || undefined,
                slackTeamId: teamId,
                userCount: 1,
                installationType: 'new'
              })
            } catch (error) {
              console.error('Failed to send team signup notification:', error)
            }
          }

          // Handle user creation/update with multi-team support
          if (userId && userAccessToken) {
            // Find or create the user (by email if available, since same person can be in multiple Slack teams)
            let dbUser = null
            if (slackProfile.email) {
              dbUser = await prisma.user.findUnique({
                where: { email: slackProfile.email },
                include: { memberships: true }
              })
            }

            // If no user found by email, create a new user
            if (!dbUser) {
              dbUser = await prisma.user.create({
                data: {
                  email: slackProfile.email,
                  name: slackProfile.name,
                  image: slackProfile.image
                },
                include: { memberships: true }
              })
            }

            // Check if user is already a member of this team
            const existingMembership = await prisma.teamMembership.findUnique({
              where: {
                userId_teamId: {
                  userId: dbUser.id,
                  teamId: team.id
                }
              }
            })

            let userSeatAllowed = true
            if (!existingMembership) {
              const canAdd = await canAddNewUser(teamId)
              if (!canAdd.allowed) {
                console.log('Cannot add new user due to seat limit:', canAdd.reason)
                userSeatAllowed = false
              }
            }

            // Create or update team membership
            await prisma.teamMembership.upsert({
              where: {
                userId_teamId: {
                  userId: dbUser.id,
                  teamId: team.id
                }
              },
              update: {
                slackUserId: userId,
                displayName: slackProfile.displayName,
                realName: slackProfile.realName,
                profileImage24: slackProfile.profileImage24,
                profileImage32: slackProfile.profileImage32,
                profileImage48: slackProfile.profileImage48,
                title: slackProfile.title,
                userAccessToken,
                isActive: userSeatAllowed,
                updatedAt: new Date()
              },
              create: {
                userId: dbUser.id,
                teamId: team.id,
                slackUserId: userId,
                displayName: slackProfile.displayName,
                realName: slackProfile.realName,
                profileImage24: slackProfile.profileImage24,
                profileImage32: slackProfile.profileImage32,
                profileImage48: slackProfile.profileImage48,
                title: slackProfile.title,
                userAccessToken,
                role: 'member',
                isActive: userSeatAllowed
              }
            })

            // Send user signup notification for new memberships
            if (!existingMembership) {
              try {
                await adminNotifications.notifyUserSignup({
                  userId,
                  userName: slackProfile.name || undefined,
                  userEmail: slackProfile.email || undefined,
                  teamId,
                  teamName: teamName || undefined,
                  source: 'slack_nextauth'
                })
              } catch (error) {
                console.error('Failed to send user signup notification:', error)
              }
            }
          }

        } catch (error) {
          console.error('❌ Error processing Slack OAuth:', error)
          return false // Prevent sign-in on error
        }
      }
      
      return true
    },
    
    async linkAccount({ user, account, profile }) {
      console.log(`🔗 Account linked: ${account.provider} for user ${user.email}`)
      
      // Slack team creation is handled in signIn callback
      // Handle web team creation for Google/Email only
      if (account.provider !== 'slack') {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: { memberships: { include: { team: true } } },
          })

          // Check if user has any personal (non-Slack) teams
          const hasPersonalTeam = dbUser?.memberships.some(m => 
            !m.team.slackTeamId || m.team.slackTeamId.startsWith('web_')
          )

          if (!hasPersonalTeam) {
            console.log(`🏢 Creating personal team for: ${user.email}`)
            const webTeamId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            
            const team = await prisma.team.create({
              data: {
                slackTeamId: webTeamId,
                teamName: `${user.name || user.email?.split('@')[0]}'s Team`,
                isActive: true,
                subscription: {
                  create: {
                    status: 'TRIAL',
                    planId: 'free',
                    monthlyLinkLimit: 20,
                    userLimit: 1,
                  }
                }
              },
            })

            // Create team membership for the user as admin
            await prisma.teamMembership.create({
              data: {
                userId: user.id,
                teamId: team.id,
                role: 'admin',
                isActive: true
              }
            })

            console.log(`✅ Created personal team ${team.id} for user ${user.email}`)
          }
        } catch (error) {
          console.error('❌ Error creating personal team:', error)
        }
      }
      
      return true
    },
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id
        
        // Get user with all their team memberships
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: { 
            memberships: {
              include: {
                team: {
                  include: {
                    subscription: true,
                  }
                }
              },
              where: { isActive: true }
            }
          },
        })

        if (dbUser) {
          session.user.dbUserId = dbUser.id
          
          // Add all team memberships to session
          session.user.teams = dbUser.memberships.map(membership => ({
            id: membership.team.id,
            name: membership.team.teamName,
            slackTeamId: membership.team.slackTeamId,
            role: membership.role,
            isSlackTeam: !!membership.team.slackTeamId && !membership.team.slackTeamId.startsWith('web_'),
            subscription: membership.team.subscription,
            membership: {
              id: membership.id,
              slackUserId: membership.slackUserId,
              displayName: membership.displayName,
              realName: membership.realName,
              profileImage24: membership.profileImage24,
              isActive: membership.isActive,
              role: membership.role
            }
          }))

          // Set default team (first personal team, or first team if no personal team)
          const personalTeam = dbUser.memberships.find(m => 
            m.team.slackTeamId?.startsWith('web_') || !m.team.slackTeamId
          )
          const defaultTeam = personalTeam || dbUser.memberships[0]
          
          if (defaultTeam) {
            session.user.currentTeam = {
              id: defaultTeam.team.id,
              name: defaultTeam.team.teamName,
              slackTeamId: defaultTeam.team.slackTeamId,
              role: defaultTeam.role,
              isSlackTeam: !!defaultTeam.team.slackTeamId && !defaultTeam.team.slackTeamId.startsWith('web_'),
              subscription: defaultTeam.team.subscription,
            }
            
            // Legacy fields for backward compatibility
            session.user.teamId = defaultTeam.team.id
            session.user.team = {
              id: defaultTeam.team.id,
              name: defaultTeam.team.teamName,
              subscription: defaultTeam.team.subscription,
            }

            // Include Slack user ID if this is a Slack team membership
            if (defaultTeam.slackUserId) {
              session.user.slackUserId = defaultTeam.slackUserId
            }
          }
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
    error: '/auth/error',
  },
  session: {
    strategy: "database",
  },
  secret: process.env.NEXTAUTH_SECRET,
}