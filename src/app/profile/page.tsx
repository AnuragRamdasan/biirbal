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
        return
      }

      const response = await fetch(`/api/profile?teamId=${storedTeamId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch profile data')
      }

      const data = await response.json()
      setTeamData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('biirbal_visited_dashboard')
    localStorage.removeItem('biirbal_team_id')
    router.push('/')
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto py-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <Link 
              href="/"
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!teamData) {
    return null
  }

  const usagePercentage = (teamData.usage.monthlyUsage / teamData.usage.monthlyLimit) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team Profile</h1>
            <p className="text-gray-600 mt-1">Manage your biirbal.ai settings</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Team Information */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Team Name</label>
              <p className="text-lg text-gray-900">{teamData.team.teamName || 'Unknown Team'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(teamData.team.isActive ? 'Active' : 'Inactive')}`}>
                {teamData.team.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Slack Team ID</label>
              <p className="text-sm text-gray-700 font-mono">{teamData.team.slackTeamId}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Joined</label>
              <p className="text-sm text-gray-700">{formatDate(teamData.team.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Subscription Info */}
        {teamData.subscription && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Subscription</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Plan</label>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(teamData.subscription.status)}`}>
                  {teamData.subscription.status}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Monthly Limit</label>
                <p className="text-lg text-gray-900">{teamData.subscription.monthlyLimit} links</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Used This Month</label>
                <p className="text-lg text-gray-900">{teamData.subscription.linksProcessed} links</p>
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
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Usage Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">{teamData.team.totalLinks}</div>
              <div className="text-sm text-gray-500">Total Links Processed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{teamData.usage.totalListens}</div>
              <div className="text-sm text-gray-500">Total Audio Listens</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{teamData.usage.monthlyUsage}</div>
              <div className="text-sm text-gray-500">This Month's Usage</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/pricing"
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Upgrade Plan
          </Link>
        </div>
      </div>
    </div>
  )
}