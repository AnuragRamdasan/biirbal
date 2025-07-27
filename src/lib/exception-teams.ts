// Exception teams that bypass all usage limits
// These teams can use the platform for free without any restrictions

export const EXCEPTION_TEAMS = [
  // Add Slack team IDs here for teams that should bypass all limits
  // Example: 'T1234567890',
  // 'T08F83XV0QG'
]

export function isExceptionTeam(teamId: string): boolean {
  return EXCEPTION_TEAMS.includes(teamId)
}

export function getExceptionTeamMessage(): string {
  return "🎉 You're using Biirbal with complimentary access! No usage limits apply to your team."
}