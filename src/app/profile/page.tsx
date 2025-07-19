'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Layout from '@/components/layout/Layout'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import StatCard from '@/components/ui/StatCard'

interface TeamMember {
  id: string
  name: string
  email?: string
  joinedAt: string
  profile?: {
    display_name?: string
    real_name?: string
    image_24?: string
    image_32?: string
    image_48?: string
    title?: string
  }
  listenStats: {
    totalListens: number
    monthlyListens: number
    completedListens: number
  }
}

interface TeamData {
  team: {
    id: string
    slackTeamId: string
    teamName: string
    isActive: boolean
    createdAt: string
    totalLinks: number
  }
  subscription: {
    status: string
    monthlyLimit: number
    linksProcessed: number
    stripeCustomerId?: string
  } | null
  usage: {
    monthlyUsage: number
    totalListens: number
    monthlyLimit: number
  }
  currentUser?: {
    id: string
    name: string
    email?: string
    profile?: {
      display_name?: string
      real_name?: string
      image_24?: string
      image_32?: string
      image_48?: string
      title?: string
    }
  }
  userListenStats?: {
    totalListens: number
    monthlyListens: number
    completedListens: number
  }
  teamMembers?: TeamMember[]
}

export default function ProfilePage() {
  const [teamData, setTeamData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchProfileData()
  }, [])

  const fetchProfileData = async () => {
    try {
      // For now, we'll use a placeholder team ID
      // In a real app, this would come from authenticated session
      const storedTeamId = localStorage.getItem('biirbal_team_id')
      if (!storedTeamId) {
        setError('No team found. Please install the bot first.')
        setLoading(false)
        return
      }

      // Try to get user ID from localStorage (this would typically come from Slack OAuth or session)
      // For demonstration, we'll check for a stored user ID
      const storedUserId = localStorage.getItem('biirbal_user_id')
      
      console.log('Fetching profile for team ID:', storedTeamId, 'and user ID:', storedUserId)
      
      let url = `/api/profile?teamId=${storedTeamId}`
      if (storedUserId) {
        url += `&userId=${storedUserId}`
      }
      
      const response = await fetch(url)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Profile API error:', errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch profile data`)
      }

      const data = await response.json()
      setTeamData(data)
    } catch (err) {
      console.error('Profile fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      // Clear all local storage items
      localStorage.removeItem('biirbal_visited_dashboard')
      localStorage.removeItem('biirbal_team_id')
      localStorage.removeItem('biirbal_user_id')
      
      // Clear any other app-specific storage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('biirbal_')) {
          localStorage.removeItem(key)
        }
      })
      
      // Redirect to home page
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
      // Even if there's an error, still redirect to home
      router.push('/')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusBadgeVariant = (status: string): 'success' | 'info' | 'error' | 'neutral' => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success'
      case 'trial':
        return 'info'
      case 'inactive':
        return 'error'
      default:
        return 'neutral'
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'trial':
        return 'bg-blue-100 text-blue-800'
      case 'inactive':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Layout currentPage="profile">
        <div className="container mx-auto px-6 py-12">
          <div className="text-center py-20">
            <LoadingSpinner size="lg" message="Loading your profile..." />
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout currentPage="profile">
        <div className="container mx-auto px-6 py-12">
          <div className="text-center py-20">
            <Card className="bg-red-50 border-red-200 max-w-md mx-auto" padding="lg">
              <div className="text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h2 className="text-xl font-semibold text-red-800 mb-2">Authentication Error</h2>
                <p className="text-red-600 mb-4">{error}</p>
                <p className="text-sm text-red-500 mb-6">
                  Please reinstall the Slack bot to fix this issue.
                </p>
                <Link href="/">
                  <Button variant="danger">
                    Reinstall Bot
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </Layout>
    )
  }

  if (!teamData) {
    return null
  }

  const usagePercentage = teamData.usage && teamData.usage.monthlyLimit > 0 
    ? (teamData.usage.monthlyUsage / teamData.usage.monthlyLimit) * 100 
    : 0

  return (
    <Layout currentPage="profile">
      <div className="container mx-auto px-6 py-8">
        {/* Logout Button in Header */}
        <div className="flex justify-end mb-6">
          <Button
            onClick={handleLogout}
            variant="danger"
            size="sm"
          >
            Logout
          </Button>
        </div>
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            👤 <span>Team Profile</span>
          </h1>
          <p className="text-gray-600 text-lg">Manage your biirbal.ai settings and subscription</p>
        </div>

        {/* Current User Information */}
        {teamData.currentUser && (
          <Card className="mb-6" padding="lg">
            <CardHeader>
              <CardTitle>Current User</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                {teamData.currentUser.profile?.image_48 && (
                  <img 
                    src={teamData.currentUser.profile.image_48} 
                    alt={teamData.currentUser.name}
                    className="w-16 h-16 rounded-full border border-gray-200"
                  />
                )}
                <div className="flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Display Name</label>
                      <p className="text-lg text-gray-900">
                        {teamData.currentUser.profile?.display_name || teamData.currentUser.name}
                      </p>
                    </div>
                    {teamData.currentUser.profile?.real_name && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Real Name</label>
                        <p className="text-lg text-gray-900">{teamData.currentUser.profile.real_name}</p>
                      </div>
                    )}
                    {teamData.currentUser.email && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                        <p className="text-sm text-gray-700">{teamData.currentUser.email}</p>
                      </div>
                    )}
                    {teamData.currentUser.profile?.title && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Title</label>
                        <p className="text-sm text-gray-700">{teamData.currentUser.profile.title}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">User ID</label>
                      <p className="text-sm text-gray-700 font-mono">{teamData.currentUser.id}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Listen Statistics */}
        {teamData.userListenStats && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-8 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Listen Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border border-green-200">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-green-600 mb-2">{teamData.userListenStats.totalListens}</div>
                <div className="text-sm text-gray-600 font-medium">Your Total Listens</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-blue-600 mb-2">{teamData.userListenStats.monthlyListens}</div>
                <div className="text-sm text-gray-600 font-medium">This Month&apos;s Listens</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-purple-600 mb-2">{teamData.userListenStats.completedListens}</div>
                <div className="text-sm text-gray-600 font-medium">Completed Listens</div>
              </div>
            </div>
          </div>
        )}

        {/* Team Information */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Team Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Team Name</label>
              <p className="text-lg text-gray-900">{teamData.team?.teamName || 'Unknown Team'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(teamData.team?.isActive ? 'Active' : 'Inactive')}`}>
                {teamData.team?.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Slack Team ID</label>
              <p className="text-sm text-gray-700 font-mono">{teamData.team?.slackTeamId || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Joined</label>
              <p className="text-sm text-gray-700">{teamData.team?.createdAt ? formatDate(teamData.team.createdAt) : 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Subscription Info */}
        {teamData.subscription && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-8 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Subscription</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Plan</label>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(teamData.subscription?.status || 'inactive')}`}>
                  {teamData.subscription?.status || 'No Plan'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Monthly Limit</label>
                <p className="text-lg text-gray-900">{teamData.subscription?.monthlyLimit || 0} links</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Used This Month</label>
                <p className="text-lg text-gray-900">{teamData.subscription?.linksProcessed || 0} links</p>
              </div>
            </div>
            
            {/* Usage Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Monthly Usage</span>
                <span>{usagePercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    usagePercentage > 90 ? 'bg-red-500' : 
                    usagePercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Usage Statistics */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Usage Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl border border-indigo-200">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-indigo-600 mb-2">{teamData.team?.totalLinks || 0}</div>
              <div className="text-sm text-gray-600 font-medium">Total Links Processed</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-purple-600 mb-2">{teamData.usage?.totalListens || 0}</div>
              <div className="text-sm text-gray-600 font-medium">Total Audio Listens</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-blue-600 mb-2">{teamData.usage?.monthlyUsage || 0}</div>
              <div className="text-sm text-gray-600 font-medium">This Month&apos;s Usage</div>
            </div>
          </div>
        </div>

        {/* Team Members */}
        {teamData.teamMembers && teamData.teamMembers.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-8 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Team Members ({teamData.teamMembers.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamData.teamMembers.map((member) => (
                <div key={member.id} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center space-x-4 mb-4">
                    {member.profile?.image_48 && (
                      <img 
                        src={member.profile.image_48} 
                        alt={member.name}
                        className="w-12 h-12 rounded-full border border-gray-200"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {member.profile?.display_name || member.name}
                      </div>
                      {member.profile?.real_name && member.profile.real_name !== member.name && (
                        <div className="text-sm text-gray-500 truncate">{member.profile.real_name}</div>
                      )}
                      {member.profile?.title && (
                        <div className="text-xs text-gray-400 truncate">{member.profile.title}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                      <div className="text-lg font-bold text-green-600">{member.listenStats.totalListens}</div>
                      <div className="text-xs text-gray-500">Total</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                      <div className="text-lg font-bold text-blue-600">{member.listenStats.monthlyListens}</div>
                      <div className="text-xs text-gray-500">This Month</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-100">
                      <div className="text-lg font-bold text-purple-600">{member.listenStats.completedListens}</div>
                      <div className="text-xs text-gray-500">Completed</div>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-400 text-center">
                    Joined {formatDate(member.joinedAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex justify-center">
          <Link href="/pricing">
            <Button size="lg" className="transform hover:scale-105">
              Upgrade Plan
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  )
}