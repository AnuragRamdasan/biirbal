'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Spin } from 'antd'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, status } = useSession()

  useEffect(() => {
    // Check if NextAuth session is loading
    if (status === 'loading') {
      return
    }

    // Only use NextAuth sessions for authentication
    const authenticated = !!session?.user

    console.log('🔐 Authentication check:', {
      authenticated,
      sessionUser: session?.user?.email,
      sessionUserId: session?.user?.id
    })

    setIsAuthenticated(authenticated)
    setIsLoading(false)

    // If not authenticated, redirect immediately
    if (!authenticated) {
      router.replace('/auth/signin')
    }
  }, [session, status, router, pathname])

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px', color: '#666' }}>
            Checking authentication...
          </div>
        </div>
      </div>
    )
  }

  // If not authenticated, don't render children (will redirect)
  if (!isAuthenticated) {
    return null
  }

  // If authenticated, render the protected content
  return <>{children}</>
} 