import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createDevSession } from '@/lib/dev-auth'

export async function GET(request: NextRequest) {
  try {
    const devUser = await getCurrentUser()
    
    if (devUser) {
      const devSession = createDevSession(devUser)
      
      if (devSession) {
        return NextResponse.json({
          success: true,
          session: devSession,
          user: {
            id: devUser.id,
            email: devUser.email,
            name: devUser.name
          }
        })
      } else {
        return NextResponse.json({ success: false, error: 'Failed to create session' })
      }
    } else {
      return NextResponse.json({ success: false, error: 'No dev user available' })
    }
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}