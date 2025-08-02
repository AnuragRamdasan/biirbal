'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface HeaderProps {
  className?: string
  showNavigation?: boolean
  currentPage?: 'home' | 'dashboard' | 'profile' | 'pricing' | 'team' | 'blog'
}

export const Header: React.FC<HeaderProps> = ({ 
  className, 
  showNavigation = true,
  currentPage 
}) => {
  const [slackAuthenticated, setSlackAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated by looking for user ID in localStorage
    const userId = localStorage.getItem('biirbal_user_id')
    setSlackAuthenticated(!!userId)
  }, [])

  const isAuthenticated = slackAuthenticated

  const handleLogout = async () => {
    try {
      // Immediately update authentication state
      setSlackAuthenticated(false)
      
      // Clear all local storage items for auth
      localStorage.removeItem('biirbal_visited_dashboard')
      localStorage.removeItem('biirbal_user_id')
      
      // Clear any other app-specific storage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('biirbal_')) {
          localStorage.removeItem(key)
        }
      })
      
      // Force immediate redirect to landing page
      window.location.href = '/'
    } catch (error) {
      console.error('Logout error:', error)
      // Even if there's an error, force redirect
      window.location.href = '/'
    }
  }
  return (
    <header className={cn(
      'bg-gradient-to-r from-blue-600 to-purple-600 text-white',
      className
    )}>
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 hover:opacity-90 transition-opacity">
            <img src="/logo.png" alt="Biirbal" className="h-8 w-8" style={{ filter: 'brightness(0) invert(1)' }} />
            <span className="text-xl font-bold">Biirbal</span>
          </Link>

          {/* Navigation */}
          {showNavigation && (
            <nav className="flex items-center space-x-6">
              {isAuthenticated && (
                <>
                  <Link 
                    href="/" 
                    className={cn(
                      'text-white/80 hover:text-white transition-colors text-sm font-medium',
                      (currentPage === 'dashboard' || currentPage === 'home') && 'text-white font-semibold'
                    )}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    href="/team" 
                    className={cn(
                      'text-white/80 hover:text-white transition-colors text-sm font-medium',
                      currentPage === 'team' && 'text-white font-semibold'
                    )}
                  >
                    Team
                  </Link>
                  <Link 
                    href="/profile" 
                    className={cn(
                      'text-white/80 hover:text-white transition-colors text-sm font-medium',
                      currentPage === 'profile' && 'text-white font-semibold'
                    )}
                  >
                    Profile
                  </Link>
                </>
              )}
              <Link 
                href="/pricing" 
                className={cn(
                  'text-white/80 hover:text-white transition-colors text-sm font-medium',
                  currentPage === 'pricing' && 'text-white font-semibold'
                )}
              >
                Pricing
              </Link>
              <Link
                href="/blog"
                className={cn(
                  'text-white/80 hover:text-white transition-colors text-sm font-medium',
                  currentPage === 'blog' && 'text-white font-semibold'
                )}
              >
                Blog
              </Link>
              {isAuthenticated ? (
                <Button 
                  onClick={handleLogout}
                  variant="secondary" 
                  size="sm"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                >
                  Logout
                </Button>
              ) : null}
            </nav>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
