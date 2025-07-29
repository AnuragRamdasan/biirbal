import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'
import { getTeamUsageStats } from '@/lib/subscription-utils'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('teamId')
  
  try {
    if (!teamId) {
      return NextResponse.json(
        { error: 'teamId is required' },
        { status: 400 }
      )
    }

    const db = await getDbClient()
    
    // Get team with users, pending invitations, and subscription info
    const team = await db.team.findUnique({
      where: { slackTeamId: teamId },
      include: {
        users: {
          orderBy: { createdAt: 'asc' }, // First users get priority
          select: {
            id: true,
            slackUserId: true,
            name: true,
            displayName: true,
            realName: true,
            email: true,
            profileImage32: true,
            isActive: true,
            createdAt: true,
            updatedAt: true
          }
        },
        invitations: {
          where: {
            status: 'PENDING',
            expiresAt: {
              gt: new Date() // Only non-expired invitations
            }
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            invitedBy: true,
            status: true,
            expiresAt: true,
            createdAt: true
          }
        },
        subscription: true
      }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Get usage stats for seat information
    const usageStats = await getTeamUsageStats(teamId)

    return NextResponse.json({
      members: team.users,
      pendingInvitations: team.invitations,
      teamInfo: {
        id: team.id,
        slackTeamId: team.slackTeamId,
        teamName: team.teamName
      },
      subscription: {
        planId: team.subscription?.planId || 'free',
        userLimit: usageStats.plan.userLimit,
        currentUsers: usageStats.currentUsers,
        userLimitExceeded: usageStats.userLimitExceeded
      }
    })
  } catch (error) {
    console.error('Failed to get team members:', error)
    return NextResponse.json(
      { error: 'Failed to get team members' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const body = await request.json()
    const { userId, action } = body

    if (!teamId || !userId || !action) {
      return NextResponse.json(
        { error: 'teamId, userId, and action are required' },
        { status: 400 }
      )
    }

    if (!['disable', 'enable', 'remove'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be disable, enable, or remove' },
        { status: 400 }
      )
    }

    const db = await getDbClient()

    // Verify team exists
    const team = await db.team.findUnique({
      where: { slackTeamId: teamId },
      include: { subscription: true }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Find the user
    const user = await db.user.findFirst({
      where: {
        slackUserId: userId,
        teamId: team.id
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found in team' },
        { status: 404 }
      )
    }

    let updateData: any = {}
    let responseMessage = ''

    switch (action) {
      case 'disable':
        updateData = { isActive: false }
        responseMessage = 'User access disabled'
        break
      case 'enable':
        updateData = { isActive: true }
        responseMessage = 'User access enabled'
        break
      case 'remove':
        // For remove, we'll set isActive to false and clear sensitive data
        updateData = {
          isActive: false,
          userAccessToken: null,
          email: null
        }
        responseMessage = 'User removed from team'
        break
    }

    // Update the user
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: updateData
    })

    return NextResponse.json({
      message: responseMessage,
      user: {
        id: updatedUser.id,
        slackUserId: updatedUser.slackUserId,
        name: updatedUser.name,
        isActive: updatedUser.isActive
      }
    })
  } catch (error) {
    console.error('Failed to update team member:', error)
    return NextResponse.json(
      { error: 'Failed to update team member' },
      { status: 500 }
    )
  }
}