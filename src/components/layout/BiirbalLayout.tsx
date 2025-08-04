import React from 'react'
import { cn } from '@/lib/utils'
import Header from './Header'

interface BiirbalLayoutProps {
  children: React.ReactNode
  currentPage?: 'home' | 'dashboard' | 'profile' | 'pricing' | 'team' | 'contact' | 'privacy' | 'terms'
  showHeader?: boolean
  variant?: 'default' | 'wide' | 'narrow'
  className?: string
}

// Simple layout that matches the actual biirbal.com design
export const BiirbalLayout: React.FC<BiirbalLayoutProps> = ({
  children,
  currentPage,
  showHeader = true,
  variant = 'default',
  className
}) => {
  const containerWidths = {
    default: 'max-w-6xl', // 1200px - matches pricing page
    wide: 'max-w-7xl',    // 1280px - for dashboard
    narrow: 'max-w-4xl'   // 800px - for content pages
  }

  return (
    <div 
      className={cn(
        'min-h-screen',
        'bg-gray-50', // Matches --background: #fafafa
        className
      )}
      style={{
        fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      
      {/* Header */}
      {showHeader && <Header currentPage={currentPage} />}
      
      {/* Main Content */}
      <main className="flex-1">
        <div className={cn(
          'mx-auto px-6', // 24px padding on sides
          containerWidths[variant]
        )}>
          {children}
        </div>
      </main>
    </div>
  )
}

// Specialized layouts matching actual usage patterns
export const DashboardLayout: React.FC<{
  children: React.ReactNode
  currentPage?: BiirbalLayoutProps['currentPage']
}> = ({ children, currentPage = 'dashboard' }) => (
  <BiirbalLayout
    currentPage={currentPage}
    variant="wide"
    className="py-8" // 32px top/bottom padding - matches page.tsx
  >
    {children}
  </BiirbalLayout>
)

export const PricingLayout: React.FC<{
  children: React.ReactNode
  currentPage?: BiirbalLayoutProps['currentPage']
}> = ({ children, currentPage = 'pricing' }) => (
  <BiirbalLayout
    currentPage={currentPage}
    variant="default"
    className="py-8" // 32px top/bottom padding - matches pricing page
  >
    {children}
  </BiirbalLayout>
)

export const ProfileLayout: React.FC<{
  children: React.ReactNode
  currentPage?: BiirbalLayoutProps['currentPage']
}> = ({ children, currentPage = 'profile' }) => (
  <BiirbalLayout
    currentPage={currentPage}
    variant="wide"
    className="py-6" // 24px top/bottom padding
  >
    {children}
  </BiirbalLayout>
)

export const ContentLayout: React.FC<{
  children: React.ReactNode
  currentPage?: BiirbalLayoutProps['currentPage']
  title?: string
  subtitle?: string
}> = ({ children, currentPage, title, subtitle }) => (
  <BiirbalLayout
    currentPage={currentPage}
    variant="narrow"
    className="py-12" // 48px top/bottom padding
  >
    {(title || subtitle) && (
      <div className="text-center mb-12">
        {title && (
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="text-lg text-gray-600">
            {subtitle}
          </p>
        )}
      </div>
    )}
    {children}
  </BiirbalLayout>
)

export default BiirbalLayout