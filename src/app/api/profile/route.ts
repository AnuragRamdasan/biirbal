import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { WebClient } from '@slack/web-api'

export async function GET(request: NextRequest) {
  try {
    // Get Slack team ID and optional user ID from query params
    // In a real app, this would come from authenticated session
    const { searchParams } = new URL(request.url)
    const slackTeamId = searchParams.get('teamId')
    const userId = searchParams.get('userId') // Optional current user ID
    
    if (!slackTeamId) {
      return NextResponse.json(
        { error: 'Team ID required' },
        { status: 400 }
      )
    }

    // Test database connection
    await prisma.$connect()

    const team = await prisma.team.findUnique({
      where: { slackTeamId: slackTeamId },
      include: {
        subscription: true,
        _count: {
          select: {
            processedLinks: true
          }
        }
      }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Get usage statistics
    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)

    const monthlyUsage = await prisma.processedLink.count({
      where: {
        teamId: team.id,
        createdAt: {
          gte: currentMonth
        }
      }
    })

    const totalListens = await prisma.audioListen.count({
      where: {
        processedLink: {
          teamId: team.id
        }
      }
    })

    // Fetch all team members with their listening statistics
    const teamMembers = await prisma.user.findMany({
      where: {
        teamId: team.id,
        isActive: true
      },
      select: {
        slackUserId: true,
        name: true,
        displayName: true,
        realName: true,
        email: true,
        profileImage24: true,
        profileImage32: true,
        profileImage48: true,
        title: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Get listening statistics for each team member
    const teamMembersWithStats = await Promise.all(
      teamMembers.map(async (member) => {
        const [memberTotalListens, memberMonthlyListens, memberCompletedListens] = await Promise.all([
          prisma.audioListen.count({
            where: {
              slackUserId: member.slackUserId,
              processedLink: {
                teamId: team.id
              }
            }
          }),
          prisma.audioListen.count({
            where: {
              slackUserId: member.slackUserId,
              processedLink: {
                teamId: team.id
              },
              listenedAt: {
                gte: currentMonth
              }
            }
          }),
          prisma.audioListen.count({
            where: {
              slackUserId: member.slackUserId,
              processedLink: {
                teamId: team.id
              },
              completed: true
            }
          })
        ])

        return {
          id: member.slackUserId,
          name: member.name || member.realName || 'Unknown User',
          email: member.email,
          joinedAt: member.createdAt,
          profile: {
            display_name: member.displayName,
            real_name: member.realName,
            image_24: member.profileImage24,
            image_32: member.profileImage32,
            image_48: member.profileImage48,
            title: member.title
          },
          listenStats: {
            totalListens: memberTotalListens,
            monthlyListens: memberMonthlyListens,
            completedListens: memberCompletedListens
          }
        }
      })
    )

    // Fetch current user information and their specific stats if userId is provided
    let currentUser = null
    let userListenStats = null
    if (userId) {
      try {
        const user = await prisma.user.findUnique({
          where: { slackUserId: userId },
          select: {
            slackUserId: true,
            name: true,
            displayName: true,
            realName: true,
            email: true,
            profileImage24: true,
            profileImage32: true,
            profileImage48: true,
            title: true,
            teamId: true
          }
        })
        
        if (user && user.teamId === team.id) {
          currentUser = {
            id: user.slackUserId,
            name: user.name || user.realName || 'Unknown User',
            email: user.email,
            profile: {
              display_name: user.displayName,
              real_name: user.realName,
              image_24: user.profileImage24,
              image_32: user.profileImage32,
              image_48: user.profileImage48,
              title: user.title
            }
          }

          // Get user-specific listen statistics
          const userTotalListens = await prisma.audioListen.count({
            where: {
              slackUserId: userId,
              processedLink: {
                teamId: team.id
              }
            }
          })

          const userMonthlyListens = await prisma.audioListen.count({
            where: {
              slackUserId: userId,
              processedLink: {
                teamId: team.id
              },
              listenedAt: {
                gte: currentMonth
              }
            }
          })

          const userCompletedListens = await prisma.audioListen.count({
            where: {
              slackUserId: userId,
              processedLink: {
                teamId: team.id
              },
              completed: true
            }
          })

          userListenStats = {
            totalListens: userTotalListens,
            monthlyListens: userMonthlyListens,
            completedListens: userCompletedListens
          }
        }
      } catch (error) {
        console.warn('Failed to fetch user info from database:', error)
        // Don't fail the entire request if user info fetch fails
      }
    }

    return NextResponse.json({
      team: {
        id: team.id,
        slackTeamId: team.slackTeamId,
        teamName: team.teamName,
        isActive: team.isActive,
        createdAt: team.createdAt,
        totalLinks: team._count.processedLinks
      },
      subscription: team.subscription,
      usage: {
        monthlyUsage,
        totalListens,
        monthlyLimit: team.subscription?.monthlyLimit || 50
      },
      currentUser,
      userListenStats,
      teamMembers: teamMembersWithStats
    })
  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile data' },
      { status: 500 }
    )
  }
}