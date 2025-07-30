"use strict";
// Exception teams that bypass all usage limits
// These teams can use the platform for free without any restrictions
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXCEPTION_TEAMS = void 0;
exports.isExceptionTeam = isExceptionTeam;
exports.getExceptionTeamMessage = getExceptionTeamMessage;
exports.getExceptionTeams = getExceptionTeams;
exports.addExceptionTeam = addExceptionTeam;
exports.removeExceptionTeam = removeExceptionTeam;
exports.EXCEPTION_TEAMS = [
// Add Slack team IDs here for teams that should bypass all limits
// Example: 'T1234567890',
// 'T08F83XV0QG'
];
function isExceptionTeam(teamId) {
    return exports.EXCEPTION_TEAMS.includes(teamId);
}
function getExceptionTeamMessage() {
    return "🎉 You're using Biirbal with complimentary access! No usage limits apply to your team.";
}
function getExceptionTeams() {
    return [...exports.EXCEPTION_TEAMS];
}
function addExceptionTeam(teamId) {
    if (!exports.EXCEPTION_TEAMS.includes(teamId)) {
        exports.EXCEPTION_TEAMS.push(teamId);
    }
}
function removeExceptionTeam(teamId) {
    const index = exports.EXCEPTION_TEAMS.indexOf(teamId);
    if (index > -1) {
        exports.EXCEPTION_TEAMS.splice(index, 1);
    }
}
