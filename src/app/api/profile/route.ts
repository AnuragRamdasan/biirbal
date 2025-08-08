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
        memberships: {
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
        }
      }
    })

    if (!user || !user.memberships?.[0]?.team) {
      return NextResponse.json(
        { error: 'User or team not found' },
        { status: 404 }
      )
    }

    const team = user.memberships[0].team
    const userMembership = user.memberships[0]

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
    const teamMemberships = await prisma.teamMembership.findMany({
      where: {
        teamId: team.id,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        joinedAt: 'asc'
      }
    })

    // Get listening statistics for each team member
    const teamMembersWithStats = await Promise.all(
      teamMemberships.map(async (membership) => {
        const [memberTotalListens, memberMonthlyListens, memberCompletedListens, memberListenDurations] = await Promise.all([
          prisma.audioListen.count({
            where: {
              slackUserId: membership.slackUserId,
              processedLink: {
                teamId: team.id
              }
            }
          }),
          prisma.audioListen.count({
            where: {
              slackUserId: membership.slackUserId,
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
              slackUserId: membership.slackUserId,
              processedLink: {
                teamId: team.id
              },
              completed: true
            }
          }),
          // Calculate total minutes listened
          prisma.audioListen.findMany({
            where: {
              slackUserId: membership.slackUserId,
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
          id: membership.slackUserId,
          name: membership.user.name || membership.realName || 'Unknown User',
          email: membership.user.email,
          joinedAt: membership.user.createdAt,
          profile: {
            display_name: membership.displayName,
            real_name: membership.realName,
            image_24: membership.profileImage24,
            image_32: membership.profileImage32,
            image_48: membership.profileImage48,
            title: membership.title
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
      name: user.name || userMembership.realName || 'Unknown User',
      email: user.email,
      profile: {
        display_name: userMembership.displayName,
        real_name: userMembership.realName,
        image_24: userMembership.profileImage24,
        image_32: userMembership.profileImage32,
        image_48: userMembership.profileImage48,
        title: userMembership.title
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