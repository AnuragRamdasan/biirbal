'use client'

import { useEffect } from 'react'

interface DevAuthData {
  authenticated: boolean
  user?: {
    id: string
    email: string
    name: string
    displayName: string
    teamId: string
    team?: {
      teamName: string
      slackTeamId: string
    }
  }
  message: string
  userId?: string
}

export default function DevAuthStatus() {
  // Only run in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const fetchAuthStatus = async () => {
    try {
      const response = await fetch('/api/dev/auth')
      const data: DevAuthData = await response.json()
      
      // Log auth status to console
      console.log('🔐 Development Authentication Status:', {
        authenticated: data.authenticated,
        message: data.message,
        user: data.user ? {
          email: data.user.email,
          displayName: data.user.displayName,
          team: data.user.team?.teamName
        } : null
      })
      
      // Auto-setup localStorage for development
      if (data.authenticated && data.userId) {
        const currentUserId = localStorage.getItem('biirbal_user_id')
        
        if (!currentUserId || currentUserId !== data.userId) {
          console.log('🔧 Setting up development localStorage...')
          localStorage.setItem('biirbal_user_id', data.userId)
          localStorage.setItem('biirbal_visited_dashboard', 'true')
          localStorage.setItem('biirbal_slack_user', 'true')
          
          console.log('✅ Development authentication configured. Refreshing page...')
          // Refresh the page to apply the authentication
          window.location.reload()
        } else {
          console.log('✅ Development authentication already configured')
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch dev auth status:', error)
    }
  }

  useEffect(() => {
    fetchAuthStatus()
  }, [])

  // Return null - no UI, only console logging
  return null
}