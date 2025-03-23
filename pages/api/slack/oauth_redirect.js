import { App } from '@slack/bolt'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req, res) {
  const app = new App({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    stateSecret: process.env.SLACK_STATE_SECRET,
    scopes: ['channels:history', 'channels:read', 'chat:write', 'links:read', 'team:read'],
    installationStore: {
      storeInstallation: async (installation) => {
        console.log('Installation stored:', installation)
        return true
      },
      fetchInstallation: async (installQuery) => {
        console.log('Fetch installation:', installQuery)
        return null
      },
    },
  })

  try {
    const result = await app.client.oauth.v2.access({
      code: req.query.code,
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
    })

    // Store workspace info in database
    const workspaceData = {
      id: result.team.id,
      name: result.team.name,
      botId: result.bot_user_id,
      botToken: result.access_token,
      accessToken: result.authed_user.access_token,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await prisma.workspace.upsert({
      where: { id: result.team.id },
      update: workspaceData,
      create: workspaceData,
    })

    console.log('OAuth success:', result)

    // Set session cookie
    res.setHeader('Set-Cookie', [
      `workspaceId=${
        result.team.id
      }; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`, // 7 days
      `workspaceName=${encodeURIComponent(
        result.team.name
      )}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`,
    ])

    res.redirect(307, '/')
  } catch (error) {
    console.error('OAuth error:', error.stack)
    res.redirect(307, '/?error=' + encodeURIComponent(error.message))
  }
}
