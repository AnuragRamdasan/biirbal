import { NextRequest, NextResponse } from 'next/server'
import { getDbClient } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { sendSummaryAsDM } = await request.json()
    
    if (typeof sendSummaryAsDM !== 'boolean') {
      return NextResponse.json(
        { error: 'sendSummaryAsDM must be a boolean' },
        { status: 400 }
      )
    }

    // Get user ID from query parameters
    const userId = request.nextUrl.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found. Please ensure you are logged in.' },
        { status: 401 }
      )
    }

    const db = await getDbClient()

    // Find user and their team
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { team: true }
    })

    if (!user || !user.team) {
      return NextResponse.json(
        { error: 'User or team not found' },
        { status: 404 }
      )
    }

    // Update the team's DM preference
    const updatedTeam = await db.team.update({
      where: { id: user.teamId },
      data: { sendSummaryAsDM }
    })

    console.log(`✅ Updated DM preference for team ${user.team.teamName}: ${sendSummaryAsDM}`)

    return NextResponse.json({
      success: true,
      sendSummaryAsDM: updatedTeam.sendSummaryAsDM,
      message: `DM preference updated to ${sendSummaryAsDM ? 'enabled' : 'disabled'}`
    })

  } catch (error) {
    console.error('Error updating DM preference:', error)
    return NextResponse.json(
      { error: 'Failed to update DM preference' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const db = await getDbClient()
    
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { 
        team: {
          select: { sendSummaryAsDM: true, teamName: true }
        }
      }
    })

    if (!user || !user.team) {
      return NextResponse.json(
        { error: 'User or team not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      sendSummaryAsDM: user.team.sendSummaryAsDM,
      teamName: user.team.teamName
    })

  } catch (error) {
    console.error('Error fetching DM preference:', error)
    return NextResponse.json(
      { error: 'Failed to fetch DM preference' },
      { status: 500 }
    )
  }
}