import React from 'react'
import { cn } from '@/lib/utils'
import { designTokens } from '@/lib/design-tokens'
import Header from './Header'

interface BaseLayoutProps {
  children: React.ReactNode
  currentPage?: 'home' | 'dashboard' | 'profile' | 'pricing' | 'team' | 'contact' | 'privacy' | 'terms'
  showHeader?: boolean
  variant?: 'default' | 'fullscreen' | 'centered' | 'wide'
  background?: 'default' | 'gradient' | 'neutral' | 'white'
  className?: string
  headerClassName?: string
  contentClassName?: string
}

const backgroundVariants = {
  default: 'bg-gradient-to-br from-white to-gray-50',
  gradient: 'bg-gradient-to-br from-blue-50 via-white to-purple-50',
  neutral: 'bg-gray-50',
  white: 'bg-white'
}

const containerVariants = {
  default: 'container mx-auto px-6',
  fullscreen: 'w-full',
  centered: 'container mx-auto px-6 max-w-4xl',
  wide: 'container mx-auto px-6 max-w-7xl'
}

export const BaseLayout: React.FC<BaseLayoutProps> = ({
  children,
  currentPage,
  showHeader = true,
  variant = 'default',
  background = 'default',
  className,
  headerClassName,
  contentClassName
}) => {
  return (
    <div 
      className={cn(
        'min-h-screen',
        backgroundVariants[background],
        className
      )}
      style={{
        fontFamily: designTokens.typography.fontFamily.sans.join(', ')
      }}
    >
      
      {/* Header */}
      {showHeader && (
        <Header 
          currentPage={currentPage}
          className={headerClassName}
        />
      )}
      
      {/* Main Content */}
      <main 
        className={cn(
          'flex-1',
          showHeader && 'pt-4', // Add spacing after header
          contentClassName
        )}
      >
        {variant === 'fullscreen' ? (
          children
        ) : (
          <div className={containerVariants[variant]}>
            {children}
          </div>
        )}
      </main>
    </div>
  )
}

// Page-specific layout components for common patterns
export const DashboardLayout: React.FC<{
  children: React.ReactNode
  currentPage?: BaseLayoutProps['currentPage']
}> = ({ children, currentPage = 'dashboard' }) => (
  <BaseLayout
    currentPage={currentPage}
    variant="wide"
    background="default"
    contentClassName="py-6"
  >
    {children}
  </BaseLayout>
)

export const AuthLayout: React.FC<{
  children: React.ReactNode
  showHeader?: boolean
}> = ({ children, showHeader = false }) => (
  <BaseLayout
    showHeader={showHeader}
    variant="centered"
    background="gradient"
    contentClassName="py-12"
  >
    <div className="max-w-md mx-auto">
      {children}
    </div>
  </BaseLayout>
)

export const ContentLayout: React.FC<{
  children: React.ReactNode
  currentPage?: BaseLayoutProps['currentPage']
  title?: string
  subtitle?: string
}> = ({ children, currentPage, title, subtitle }) => (
  <BaseLayout
    currentPage={currentPage}
    variant="centered"
    background="white"
    contentClassName="py-8"
  >
    {(title || subtitle) && (
      <div className="text-center mb-8">
        {title && (
          <h1 
            className="text-4xl font-bold text-gray-900 mb-4"
            style={{ 
              fontSize: designTokens.typography.fontSize['4xl'],
              fontWeight: designTokens.typography.fontWeight.bold,
              color: designTokens.colors.neutral[900]
            }}
          >
            {title}
          </h1>
        )}
        {subtitle && (
          <p 
            className="text-xl text-gray-600"
            style={{
              fontSize: designTokens.typography.fontSize.xl,
              color: designTokens.colors.neutral[600]
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    )}
    {children}
  </BaseLayout>
)

export const LandingLayout: React.FC<{
  children: React.ReactNode
}> = ({ children }) => (
  <BaseLayout
    currentPage="home"
    variant="fullscreen"
    background="gradient"
  >
    {children}
  </BaseLayout>
)

export default BaseLayout