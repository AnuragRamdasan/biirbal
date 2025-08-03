# Chrome Extension API Integration

This document outlines the API endpoints created to support the Biirbal Chrome Extension integration with NextAuth authentication.

## API Endpoints

### Authentication
All extension APIs now use NextAuth session-based authentication. Users must be signed in via Google OAuth or email to use the extension.

### 1. Save Link API
**Endpoint**: `POST /api/extension/save-link`

**Authentication**: NextAuth session required

**Request Body**:
```json
{
  "url": "https://example.com/article",
  "title": "Article Title",
  "teamId": "team_id_or_slack_team_id", // Optional - uses user's default team if not provided
  "source": "chrome-extension"
}
```

**Response**:
```json
{
  "message": "Link saved successfully",
  "linkId": "link_uuid",
  "status": "PENDING"
}
```

**Features**:
- Works with both Slack teams and web-only teams
- Automatically creates virtual channels for web-only teams
- Verifies user has access to the specified team
- Prevents duplicate links
- Queues link for processing

### 2. Teams API (Extension)
**Endpoint**: `GET /api/extension/teams`

**Authentication**: NextAuth session required

**Response**:
```json
{
  "teams": [
    {
      "id": "team_uuid",
      "slackTeamId": "slack_team_id", // or team_uuid for web-only teams
      "teamName": "My Team",
      "isActive": true,
      "subscription": {
        "status": "ACTIVE",
        "planId": "starter",
        "monthlyLinkLimit": 100
      },
      "usage": 15,
      "canAddLinks": true
    }
  ],
  "totalTeams": 1
}
```

### 3. Teams API (Alternative)
**Endpoint**: `GET /api/teams`

**Authentication**: NextAuth session required

**Response**: Array format for extension compatibility
```json
[
  {
    "id": "team_uuid",
    "slackTeamId": "slack_team_id",
    "teamName": "My Team",
    "isActive": true,
    "subscription": { ... }
  }
]
```

### 4. Team Members API (Updated)
**Endpoint**: `GET /api/team/members`

**Authentication**: NextAuth session required (no userId parameter needed)

**Query Parameters**:
- `userId` (optional) - If not provided, uses session user ID

**Response**: Existing format with team member information

## Extension Integration Flow

1. **Authentication Check**: Extension checks if user is authenticated via NextAuth session cookies
2. **Team Loading**: Extension calls `/api/extension/teams` or `/api/teams` to get available teams
3. **Link Saving**: When user saves a link, extension calls `/api/extension/save-link`
4. **Processing**: Link is queued for AI processing and audio generation

## Web-Only Team Support

The APIs now fully support teams created through web authentication (non-Slack):

- **Virtual Channels**: Automatically creates "Web Links" channels for web-only teams
- **Team Identification**: Uses team UUID as fallback identifier for teams without Slack integration
- **Session Management**: Works seamlessly with NextAuth sessions

## Error Handling

- **401 Unauthorized**: User not authenticated - extension should redirect to login
- **404 Team Not Found**: User doesn't have access to specified team
- **400 Bad Request**: Invalid request parameters
- **500 Server Error**: Internal processing error

## Extension Configuration

The Chrome extension should be updated to:

1. Check for NextAuth session cookies (`__Secure-next-auth.session-token` or `next-auth.session-token`)
2. Use the new team endpoint formats
3. Handle web-only teams (teams without `slackTeamId`)
4. Show appropriate error messages for authentication failures

## Environment Variables

No additional environment variables required - uses existing NextAuth configuration:

- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID` 
- `GOOGLE_CLIENT_SECRET`
- `BREVO_API_KEY` (for email authentication)

## Testing

To test the extension integration:

1. Ensure user is logged in via `/auth/signin`
2. Test team loading via `/api/extension/teams`
3. Test link saving via `/api/extension/save-link`
4. Verify links appear in dashboard and are processed correctly

## Migration Notes

Existing Slack-based teams continue to work unchanged. The APIs are backward compatible and handle both Slack teams and web-only teams transparently.