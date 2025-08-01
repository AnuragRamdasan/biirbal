import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'
import { adminNotifications } from '@/lib/admin-notifications'

export async function POST(request: NextRequest) {
  try {
    const { token, name, password } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      )
    }

    const db = await getDbClient()

    // Find the invitation
    const invitation = await db.teamInvitation.findUnique({
      where: { token },
      include: {
        team: true
      }
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      )
    }

    // Check if invitation is still valid
    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Invitation has already been used or revoked' },
        { status: 410 }
      )
    }

    if (invitation.expiresAt < new Date()) {
      // Mark as expired
      await db.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' }
      })

      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      )
    }

    // Check if user already exists with this email
    let user = await db.user.findUnique({
      where: { email: invitation.email }
    })

    if (user) {
      // If user exists but is not part of this team, add them
      if (user.teamId !== invitation.teamId) {
        user = await db.user.update({
          where: { email: invitation.email },
          data: {
            teamId: invitation.teamId,
            isActive: true,
            // Update name if provided
            ...(name && { name, realName: name })
          }
        })
      } else if (!user.isActive) {
        // Reactivate user if they were previously deactivated
        user = await db.user.update({
          where: { email: invitation.email },
          data: { isActive: true }
        })
      }
    } else {
      // Create new user
      user = await db.user.create({
        data: {
          email: invitation.email,
          teamId: invitation.teamId,
          name: name || invitation.email.split('@')[0],
          realName: name || invitation.email.split('@')[0],
          isActive: true,
          ...(password && { password }) // Add password if provided for email auth
        }
      })
    }

    // Mark invitation as accepted
    await db.teamInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date()
      }
    })

    // Send admin notification
    await adminNotifications.notifyUserSignup({
      userId: user.id,
      userName: user.name || undefined,
      userEmail: user.email || undefined,
      teamId: invitation.team.slackTeamId,
      teamName: invitation.team.teamName || undefined,
      source: 'email_signup'
    })

    return NextResponse.json({
      message: 'Invitation accepted successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        teamId: invitation.team.id, // Database team ID
        teamName: invitation.team.teamName
      },
      redirectUrl: '/dashboard'
    })

  } catch (error) {
    console.error('Failed to accept invitation:', error)
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}

// GET endpoint to validate invitation token and get invitation details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      )
    }

    const db = await getDbClient()

    // Find the invitation
    const invitation = await db.teamInvitation.findUnique({
      where: { token },
      include: {
        team: true
      }
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      )
    }

    // Check if invitation is still valid
    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Invitation has already been used or revoked' },
        { status: 410 }
      )
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      )
    }

    return NextResponse.json({
      invitation: {
        email: invitation.email,
        teamName: invitation.team.teamName,
        expiresAt: invitation.expiresAt,
        invitedBy: invitation.invitedBy
      }
    })

  } catch (error) {
    console.error('Failed to validate invitation:', error)
    return NextResponse.json(
      { error: 'Failed to validate invitation' },
      { status: 500 }
    )
  }
}