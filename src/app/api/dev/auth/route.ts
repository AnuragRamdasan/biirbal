import { NextResponse } from 'next/server'
import { getCurrentUser, shouldBypassAuth, createDevSession } from '@/lib/dev-auth'

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  try {
    if (shouldBypassAuth()) {
      const user = await getCurrentUser()
      
      if (user) {
        const session = createDevSession(user)
        return NextResponse.json({
          authenticated: true,
          user: session?.user || null,
          session,
          userId: user.id, // Include user ID for localStorage setup
          message: 'Development user authenticated automatically'
        })
      }
    }

    return NextResponse.json({
      authenticated: false,
      user: null,
      message: 'Development authentication not enabled or user not found'
    })
  } catch (error) {
    console.error('Dev auth error:', error)
    return NextResponse.json({ 
      error: 'Failed to get development user',
      authenticated: false,
      user: null
    }, { status: 500 })
  }
}

// POST endpoint to toggle dev auth
export async function POST(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  try {
    const { action } = await request.json()
    
    if (action === 'enable') {
      // In a real app, you might set an environment variable or session flag
      return NextResponse.json({ 
        message: 'Dev auth enabled. Set DEV_AUTO_LOGIN=true in your .env.development file',
        enabled: true
      })
    }
    
    if (action === 'disable') {
      return NextResponse.json({ 
        message: 'Dev auth disabled. Set DEV_AUTO_LOGIN=false in your .env.development file',
        enabled: false
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Dev auth toggle error:', error)
    return NextResponse.json({ error: 'Failed to toggle dev auth' }, { status: 500 })
  }
}