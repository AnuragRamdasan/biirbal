import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import EmailProvider from "next-auth/providers/email"
import { emailService } from "@/lib/email-service"
import { prisma } from "@/lib/db"


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
      
      // Always allow sign-in - let NextAuth handle account linking
      return true
    },
    
    async linkAccount({ user, account, profile }) {
      console.log(`🔗 Account linked: ${account.provider} for user ${user.email}`)
      
      // Handle web team creation for Google/Email
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: { team: true },
        })

        if (!dbUser?.team) {
          console.log(`🏢 Creating web team for: ${user.email}`)
          const webTeamId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          
          const team = await prisma.team.create({
            data: {
              slackTeamId: webTeamId,
              teamName: `${user.name || user.email?.split('@')[0]}'s Team`,
              isActive: true,
            },
          })

          await prisma.subscription.create({
            data: {
              teamId: team.id,
              status: 'TRIAL',
              planId: 'free',
              monthlyLinkLimit: 20,
              userLimit: 1,
            },
          })

          await prisma.user.update({
            where: { id: user.id },
            data: { teamId: team.id },
          })
        }
      } catch (error) {
        console.error('❌ Error creating web team:', error)
      }
      
      return true
    },
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id
        
        // Fetch user's team information
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: { 
            team: {
              include: {
                subscription: true,
              }
            }
          },
        })

        if (dbUser?.team) {
          session.user.teamId = dbUser.team.id
          session.user.team = {
            id: dbUser.team.id,
            name: dbUser.team.teamName,
            subscription: dbUser.team.subscription,
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