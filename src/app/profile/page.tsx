'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'text-green-600 bg-green-50'
      case 'trial':
        return 'text-blue-600 bg-blue-50'
      case 'inactive':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold">🧠 biirbal.ai</span>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/dashboard" className="text-white/80 hover:text-white transition-colors text-sm">
                  Dashboard
                </Link>
                <Link href="/" className="text-white/80 hover:text-white transition-colors text-sm">
                  ← Home
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto px-6 py-12">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your profile...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold">🧠 biirbal.ai</span>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/dashboard" className="text-white/80 hover:text-white transition-colors text-sm">
                  Dashboard
                </Link>
                <Link href="/" className="text-white/80 hover:text-white transition-colors text-sm">
                  ← Home
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto px-6 py-12">
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md mx-auto shadow-sm">
              <h2 className="text-xl font-semibold text-red-800 mb-2">Authentication Error</h2>
              <p className="text-red-600 mb-4">{error}</p>
              <p className="text-sm text-red-500 mb-6">
                Please reinstall the Slack bot to fix this issue.
              </p>
              <Link 
                href="/"
                className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold"
              >
                Reinstall Bot
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!teamData) {
    return null
  }

  const usagePercentage = teamData.usage && teamData.usage.monthlyLimit > 0 
    ? (teamData.usage.monthlyUsage / teamData.usage.monthlyLimit) * 100 
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold">🧠 biirbal.ai</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-white/80 hover:text-white transition-colors text-sm"
              >
                Dashboard
              </Link>
              <Link
                href="/"
                className="text-white/80 hover:text-white transition-colors text-sm"
              >
                ← Home
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Profile</h1>
          <p className="text-gray-600">Manage your biirbal.ai settings and subscription</p>
        </div>

        {/* Current User Information */}
        {teamData.currentUser && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-8 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Current User</h2>
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
          </div>
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

        {/* Actions */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/pricing"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-indigo-500/25"
          >
            Upgrade Plan
          </Link>
        </div>
      </div>
    </div>
  )
}