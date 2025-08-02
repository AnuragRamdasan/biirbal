import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'
import { emailService } from '@/lib/email-service'
import { adminNotifications } from '@/lib/admin-notifications'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email, invitedBy } = await request.json()

    if (!email || !invitedBy) {
      return NextResponse.json(
        { error: 'Email and invitedBy are required' },
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

    // Get the inviting user and their team
    const invitingUser = await db.user.findUnique({
      where: { id: invitedBy },
      include: { 
        team: {
          include: {
            users: { where: { isActive: true } }
          }
        }
      }
    })

    if (!invitingUser || !invitingUser.team) {
      return NextResponse.json(
        { error: 'User or team not found' },
        { status: 404 }
      )
    }

    const team = invitingUser.team

    // Check if inviting user is active
    if (!invitingUser.isActive) {
      return NextResponse.json(
        { error: 'Only active team members can send invitations' },
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

    // Note: We allow unlimited invitations regardless of plan limits
    // Access control is handled when users actually try to use features

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

    // Generate invitation URL
    const baseUrl = process.env.NEXTAUTH_URL || 'https://www.biirbal.com'
    const inviteUrl = `${baseUrl}/invite/${token}`

    // Try to send invitation email FIRST
    const emailSent = await emailService.sendTeamInvitation({
      email: email,
      teamName: team.teamName || 'Your Team',
      inviterName: invitingUser.realName || invitingUser.name || 'A team member',
      inviteUrl: inviteUrl,
      expiresAt: expiresAt
    })

    // If email sending fails, don't create the invitation
    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send invitation email. Please check that email service is configured properly and try again.' },
        { status: 500 }
      )
    }

    // Only create invitation record if email was sent successfully
    const invitation = await db.teamInvitation.create({
      data: {
        teamId: team.id,
        email: email,
        invitedBy: invitedBy,
        token: token,
        expiresAt: expiresAt
      }
    })

    // Send admin notification
    await adminNotifications.notifyUserInvited({
      teamId: team.slackTeamId,
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