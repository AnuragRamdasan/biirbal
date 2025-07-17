import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface HeaderProps {
  className?: string
  showNavigation?: boolean
  currentPage?: 'home' | 'dashboard' | 'profile' | 'pricing'
}

export const Header: React.FC<HeaderProps> = ({ 
  className, 
  showNavigation = true,
  currentPage 
}) => {
  return (
    <header className={cn(
      'bg-gradient-to-r from-blue-600 to-purple-600 text-white',
      className
    )}>
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 hover:opacity-90 transition-opacity">
            <span className="text-2xl">🧠</span>
            <span className="text-xl font-bold">biirbal.ai</span>
          </Link>

          {/* Navigation */}
          {showNavigation && (
            <nav className="flex items-center space-x-6">
              <Link 
                href="/dashboard" 
                className={cn(
                  'text-white/80 hover:text-white transition-colors text-sm font-medium',
                  currentPage === 'dashboard' && 'text-white font-semibold'
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
              <Link 
                href="/pricing" 
                className={cn(
                  'text-white/80 hover:text-white transition-colors text-sm font-medium',
                  currentPage === 'pricing' && 'text-white font-semibold'
                )}
              >
                Pricing
              </Link>
              <Button 
                variant="secondary" 
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
              >
                Get Started
              </Button>
            </nav>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header