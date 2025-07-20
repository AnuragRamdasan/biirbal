"use strict";
// Exception teams that bypass all usage limits
// These teams can use the platform for free without any restrictions
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXCEPTION_TEAMS = void 0;
exports.isExceptionTeam = isExceptionTeam;
exports.getExceptionTeamMessage = getExceptionTeamMessage;
exports.EXCEPTION_TEAMS = [
    // Add Slack team IDs here for teams that should bypass all limits
    // Example: 'T1234567890',
    'T08F83XV0QG'
];
function isExceptionTeam(teamId) {
    return exports.EXCEPTION_TEAMS.includes(teamId);
}
function getExceptionTeamMessage() {
    return "🎉 You're using Biirbal with complimentary access! No usage limits apply to your team.";
}
