"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBaseUrl = getBaseUrl;
exports.getOAuthRedirectUri = getOAuthRedirectUri;
exports.getDashboardUrl = getDashboardUrl;
/**
 * Get the base URL for the application
 * Uses NEXTAUTH_URL as the primary source of truth for the domain
 */
function getBaseUrl() {
    // Use NEXTAUTH_URL as primary source (should be https://www.biirbal.com)
    if (process.env.NEXTAUTH_URL) {
        return process.env.NEXTAUTH_URL;
    }
    // Fallback to NEXT_PUBLIC_BASE_URL if available
    if (process.env.NEXT_PUBLIC_BASE_URL) {
        return process.env.NEXT_PUBLIC_BASE_URL;
    }
    // Final fallback to the correct domain
    return 'https://www.biirbal.com';
}
/**
 * Get the OAuth redirect URI
 */
function getOAuthRedirectUri() {
    return `${getBaseUrl()}/api/slack/oauth`;
}
/**
 * Get the dashboard URL with optional link ID
 */
function getDashboardUrl(linkId) {
    const baseUrl = getBaseUrl();
    return linkId ? `${baseUrl}/dashboard#${linkId}` : `${baseUrl}/dashboard`;
}
