import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'
import { getTeamUsageStats } from '@/lib/subscription-utils'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  
  try {
    let actualUserId = userId;
    
    // If no userId provided, try to get it from session (for extension)
    if (!userId) {
      const session = await getServerSession(authOptions)
      if (session?.user?.id) {
        actualUserId = session.user.id
      } else {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
    }

    const db = await getDbClient()
    
    // Get user's team info first
    const user = await db.user.findUnique({
      where: { id: actualUserId },
      select: {
        id: true,
        memberships: {
          select: {
            team: {
              select: {
                id: true,
                slackTeamId: true,
                teamName: true,
                sendSummaryAsDM: true
              }
            }
          }
        }
      }
    })

    if (!user || !user.memberships?.[0]?.team) {
      return NextResponse.json(
        { error: 'User or team not found' },
        { status: 404 }
      )
    }

    const userTeam = user.memberships[0].team;

    // Get complete team data with users, pending invitations, and subscription info
    const team = await db.team.findUnique({
      where: { id: userTeam.id },
      include: {
        memberships: {
          orderBy: { joinedAt: 'asc' }, // First users get priority
          select: {
            id: true,
            slackUserId: true,
            displayName: true,
            realName: true,
            profileImage32: true,
            isActive: true,
            joinedAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                createdAt: true
              }
            }
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

    // Get usage stats for seat information (use team ID for web-only teams)
    const usageStats = await getTeamUsageStats(team.slackTeamId || team.id)

    // Transform memberships to match expected format
    const members = team.memberships.map(membership => ({
      id: membership.user.id,
      slackUserId: membership.slackUserId,
      name: membership.user.name || membership.displayName || membership.realName,
      displayName: membership.displayName,
      realName: membership.realName,
      email: membership.user.email,
      profileImage32: membership.profileImage32,
      isActive: membership.isActive,
      createdAt: membership.user.createdAt,
      updatedAt: membership.updatedAt
    }));

    return NextResponse.json({
      members,
      pendingInvitations: team.invitations,
      team: {
        id: team.id,
        slackTeamId: team.slackTeamId,
        teamName: team.teamName,
        sendSummaryAsDM: team.sendSummaryAsDM
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

    // Find the team membership
    const membership = await db.teamMembership.findFirst({
      where: {
        slackUserId: userId,
        teamId: team.id
      },
      include: {
        user: true
      }
    })

    if (!membership) {
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
          userAccessToken: null
        }
        responseMessage = 'User removed from team'
        break
    }

    // Update the team membership
    const updatedMembership = await db.teamMembership.update({
      where: { id: membership.id },
      data: updateData,
      include: {
        user: true
      }
    })

    return NextResponse.json({
      message: responseMessage,
      user: {
        id: updatedMembership.user.id,
        slackUserId: updatedMembership.slackUserId,
        name: updatedMembership.user.name,
        isActive: updatedMembership.isActive
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