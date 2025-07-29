import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'
import { emailService } from '@/lib/email-service'
import { adminNotifications } from '@/lib/admin-notifications'

export async function POST(request: NextRequest) {
  try {
    const { userId, teamId, removedBy } = await request.json()

    if (!userId || !teamId || !removedBy) {
      return NextResponse.json(
        { error: 'userId, teamId, and removedBy are required' },
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

    // Check if removing user is part of the team and active
    // First try to find by slackUserId, then by database id for invited users
    let removingUser = team.users.find(u => u.slackUserId === removedBy)
    if (!removingUser) {
      removingUser = team.users.find(u => u.id === removedBy)
    }
    if (!removingUser) {
      return NextResponse.json(
        { error: 'Only team members can remove users' },
        { status: 403 }
      )
    }

    // Find the user to be removed (can be by slackUserId or email)
    let userToRemove
    if (userId.includes('@')) {
      // It's an email address
      userToRemove = await db.user.findFirst({
        where: {
          email: userId,
          teamId: team.id
        }
      })
    } else {
      // It's a slackUserId
      userToRemove = await db.user.findFirst({
        where: {
          slackUserId: userId,
          teamId: team.id
        }
      })
    }

    if (!userToRemove) {
      return NextResponse.json(
        { error: 'User not found in team' },
        { status: 404 }
      )
    }

    // Prevent self-removal
    if (userToRemove.slackUserId === removedBy || userToRemove.id === removedBy) {
      return NextResponse.json(
        { error: 'Users cannot remove themselves' },
        { status: 403 }
      )
    }

    // Check if user is already inactive
    if (!userToRemove.isActive) {
      return NextResponse.json(
        { error: 'User is already inactive' },
        { status: 409 }
      )
    }

    // Deactivate the user instead of deleting to preserve data integrity
    const updatedUser = await db.user.update({
      where: { id: userToRemove.id },
      data: { isActive: false }
    })

    // Send removal notification email if user has email
    if (userToRemove.email) {
      const emailSent = await emailService.sendTeamRemovalNotification({
        email: userToRemove.email,
        teamName: team.teamName || 'Your Team',
        removedBy: removingUser.realName || removingUser.name || 'A team admin'
      })

      if (!emailSent) {
        console.warn('Failed to send removal notification email, but user was removed')
      }
    }

    // Send admin notification
    await adminNotifications.notifyUserRemoved({
      teamId: teamId,
      teamName: team.teamName || undefined,
      email: userToRemove.email || 'No email',
      invitedBy: removedBy,
      invitedByName: removingUser.realName || removingUser.name || undefined
    })

    return NextResponse.json({
      message: 'User removed successfully',
      removedUser: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        slackUserId: updatedUser.slackUserId,
        isActive: updatedUser.isActive
      }
    })

  } catch (error) {
    console.error('Failed to remove team member:', error)
    return NextResponse.json(
      { error: 'Failed to remove user' },
      { status: 500 }
    )
  }
}