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

    // Get team ID from query parameters (same approach as profile API)
    const teamId = request.nextUrl.searchParams.get('teamId')
    
    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID not found. Please ensure you are logged in.' },
        { status: 401 }
      )
    }

    const db = await getDbClient()

    // Find team by Slack team ID (since that's what we store in localStorage)
    const team = await db.team.findUnique({
      where: { slackTeamId: teamId }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Update the team's DM preference
    const updatedTeam = await db.team.update({
      where: { slackTeamId: teamId },
      data: { sendSummaryAsDM }
    })

    console.log(`✅ Updated DM preference for team ${team.teamName}: ${sendSummaryAsDM}`)

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
    const teamId = request.nextUrl.searchParams.get('teamId')
    
    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      )
    }

    const db = await getDbClient()
    
    const team = await db.team.findUnique({
      where: { slackTeamId: teamId },
      select: { sendSummaryAsDM: true, teamName: true }
    })

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      sendSummaryAsDM: team.sendSummaryAsDM,
      teamName: team.teamName
    })

  } catch (error) {
    console.error('Error fetching DM preference:', error)
    return NextResponse.json(
      { error: 'Failed to fetch DM preference' },
      { status: 500 }
    )
  }
}