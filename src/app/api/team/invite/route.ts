import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'
import { emailService } from '@/lib/email-service'
import { adminNotifications } from '@/lib/admin-notifications'
import { canAddNewUser } from '@/lib/subscription-utils'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email, teamId, invitedBy } = await request.json()

    if (!email || !teamId || !invitedBy) {
      return NextResponse.json(
        { error: 'Email, teamId, and invitedBy are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const db = await getDbClient()

    // Check if team exists and get team info
    const team = await db.team.findUnique({
      where: { slackTeamId: teamId },
      include: {
        users: { where: { isActive: true } }
      }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Check if inviting user is part of the team and active
    const invitingUser = team.users.find(u => u.slackUserId === invitedBy)
    if (!invitingUser) {
      return NextResponse.json(
        { error: 'Only team members can send invitations' },
        { status: 403 }
      )
    }

    // Check if user is already a team member
    const existingUser = await db.user.findFirst({
      where: {
        email: email,
        teamId: team.id
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: existingUser.isActive ? 'User is already a team member' : 'User exists but is inactive. Contact admin to reactivate.' },
        { status: 409 }
      )
    }

    // Check team limits before creating invitation
    const canAdd = await canAddNewUser(teamId)
    if (!canAdd.allowed) {
      return NextResponse.json(
        { error: canAdd.reason || 'Cannot add new user due to plan limits' },
        { status: 403 }
      )
    }

    // Check for existing pending invitation
    const existingInvitation = await db.teamInvitation.findFirst({
      where: {
        teamId: team.id,
        email: email,
        status: 'PENDING',
        expiresAt: {
          gt: new Date()
        }
      }
    })

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An active invitation already exists for this email' },
        { status: 409 }
      )
    }

    // Generate unique invitation token
    const token = crypto.randomBytes(32).toString('hex')
    
    // Set expiration to 1 week from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create invitation record
    const invitation = await db.teamInvitation.create({
      data: {
        teamId: team.id,
        email: email,
        invitedBy: invitedBy,
        token: token,
        expiresAt: expiresAt
      }
    })

    // Generate invitation URL
    const baseUrl = process.env.NEXTAUTH_URL || 'https://www.biirbal.com'
    const inviteUrl = `${baseUrl}/invite/${token}`

    // Send invitation email
    const emailSent = await emailService.sendTeamInvitation({
      email: email,
      teamName: team.teamName || 'Your Team',
      inviterName: invitingUser.realName || invitingUser.name || 'A team member',
      inviteUrl: inviteUrl,
      expiresAt: expiresAt
    })

    if (!emailSent) {
      console.warn('Failed to send invitation email, but invitation was created')
    }

    // Send admin notification
    await adminNotifications.notifyUserInvited({
      teamId: teamId,
      teamName: team.teamName || undefined,
      email: email,
      invitedBy: invitedBy,
      invitedByName: invitingUser.realName || invitingUser.name || undefined
    })

    return NextResponse.json({
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
        status: invitation.status
      }
    })

  } catch (error) {
    console.error('Failed to send team invitation:', error)
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    )
  }
}