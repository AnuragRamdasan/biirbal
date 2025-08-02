import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get user ID from query params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    // Test database connection
    await prisma.$connect()

    // Get user and their team
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        team: {
          include: {
            subscription: true,
            _count: {
              select: {
                processedLinks: true
              }
            }
          }
        }
      }
    })

    if (!user || !user.team) {
      return NextResponse.json(
        { error: 'User or team not found' },
        { status: 404 }
      )
    }

    const team = user.team

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
        const [memberTotalListens, memberMonthlyListens, memberCompletedListens, memberListenDurations] = await Promise.all([
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
          }),
          // Calculate total minutes listened
          prisma.audioListen.findMany({
            where: {
              slackUserId: member.slackUserId,
              processedLink: {
                teamId: team.id
              }
            },
            select: {
              listenDuration: true,
              completed: true,
              processedLink: {
                select: {
                  audioFileUrl: true
                }
              }
            }
          })
        ])

        // Calculate minutes listened from actual durations
        const totalSecondsListened = memberListenDurations.reduce((total, listen) => {
          if (listen.listenDuration && listen.listenDuration > 0) {
            return total + listen.listenDuration
          }
          // For completed listens without duration, estimate ~59 seconds
          if (listen.completed && listen.processedLink.audioFileUrl) {
            return total + 59
          }
          return total
        }, 0)

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
            completedListens: memberCompletedListens,
            minutesListened: Math.round(totalSecondsListened / 60)
          }
        }
      })
    )

    // Set current user info (we already have the user from the initial query)
    const currentUser = {
      id: user.id,
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
    const [userTotalListens, userMonthlyListens, userCompletedListens, userListenDurations] = await Promise.all([
      prisma.audioListen.count({
        where: {
          userId: user.id,
          processedLink: {
            teamId: team.id
          }
        }
      }),
      prisma.audioListen.count({
        where: {
          userId: user.id,
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
          userId: user.id,
          processedLink: {
            teamId: team.id
          },
          completed: true
        }
      }),
      prisma.audioListen.findMany({
        where: {
          userId: user.id,
          processedLink: {
            teamId: team.id
          }
        },
        select: {
          listenDuration: true,
          completed: true,
          processedLink: {
            select: {
              audioFileUrl: true
            }
          }
        }
      })
    ])

    // Calculate minutes listened from actual durations
    const userTotalSecondsListened = userListenDurations.reduce((total, listen) => {
      if (listen.listenDuration && listen.listenDuration > 0) {
        return total + listen.listenDuration
      }
      // For completed listens without duration, estimate ~59 seconds
      if (listen.completed && listen.processedLink.audioFileUrl) {
        return total + 59
      }
      return total
    }, 0)

    const userListenStats = {
      totalListens: userTotalListens,
      monthlyListens: userMonthlyListens,
      completedListens: userCompletedListens,
      minutesListened: Math.round(userTotalSecondsListened / 60)
    }

    return NextResponse.json({
      team: {
        id: team.id,
        slackTeamId: team.slackTeamId,
        teamName: team.teamName,
        isActive: team.isActive,
        createdAt: team.createdAt,
        totalLinks: team._count.processedLinks,
        sendSummaryAsDM: team.sendSummaryAsDM
      },
      subscription: team.subscription,
      usage: {
        monthlyUsage,
        totalListens,
        monthlyLinkLimit: team.subscription?.monthlyLinkLimit || 10
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