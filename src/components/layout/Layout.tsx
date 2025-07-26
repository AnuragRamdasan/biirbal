import React from 'react'
import Header from './Header'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: React.ReactNode
  currentPage?: 'home' | 'dashboard' | 'profile' | 'pricing' | 'privacy' | 'contact'
  showHeader?: boolean
  className?: string
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentPage,
  showHeader = true,
  className 
}) => {
  return (
    <div className={cn('min-h-screen bg-gradient-to-br from-white to-gray-50', className)}>
      {showHeader && <Header currentPage={currentPage} />}
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}

export default Layout