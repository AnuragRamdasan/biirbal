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

export function getExceptionTeams(): string[] {
  return [...EXCEPTION_TEAMS]
}

export function addExceptionTeam(teamId: string): void {
  if (!EXCEPTION_TEAMS.includes(teamId)) {
    EXCEPTION_TEAMS.push(teamId)
  }
}

export function removeExceptionTeam(teamId: string): void {
  const index = EXCEPTION_TEAMS.indexOf(teamId)
  if (index > -1) {
    EXCEPTION_TEAMS.splice(index, 1)
  }
}