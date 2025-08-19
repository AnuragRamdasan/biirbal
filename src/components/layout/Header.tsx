'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useExtensionDetection } from '@/hooks/useExtensionDetection'
import { useBrowserDetection } from '@/hooks/useBrowserDetection'

interface HeaderProps {
  className?: string
  showNavigation?: boolean
  currentPage?: 'home' | 'dashboard' | 'profile' | 'pricing' | 'blog'
}

export const Header: React.FC<HeaderProps> = ({ 
  className, 
  showNavigation = true,
  currentPage 
}) => {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [hasDevAuth, setHasDevAuth] = useState(false)
  const { isInstalled: extensionInstalled, isChecking: extensionChecking } = useExtensionDetection()
  const extensionInfo = useBrowserDetection()

  // Check for dev authentication
  useEffect(() => {
    const checkDevAuth = async () => {
      try {
        const response = await fetch('/api/dev-auth')
        const result = await response.json()
        setHasDevAuth(result.success)
      } catch (error) {
        setHasDevAuth(false)
      }
    }
    
    checkDevAuth()
  }, [])

  const isAuthenticated = !!session?.user || hasDevAuth

  const handleLogout = async () => {
    try {
      // Use NextAuth signOut
      await signOut({ callbackUrl: '/' })
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
                  {/* Show extension install button if not installed */}
                  {!extensionChecking && extensionInstalled === false && (
                    <a
                      href={extensionInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded-full transition-colors duration-200 shadow-md hover:shadow-lg"
                    >
                      <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                      </svg>
                      Install Extension
                    </a>
                  )}
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
              ) : (
                <Link href="/auth/signin">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                  >
                    Login
                  </Button>
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
