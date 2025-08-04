"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProduction = isProduction;
exports.isDevelopment = isDevelopment;
exports.getBaseUrl = getBaseUrl;
exports.getOAuthRedirectUri = getOAuthRedirectUri;
exports.getDashboardUrl = getDashboardUrl;
/**
 * Check if running in production environment
 */
function isProduction() {
    return process.env.NODE_ENV === 'production';
}
/**
 * Check if running in development environment
 */
function isDevelopment() {
    return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}
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
    // Environment-specific defaults
    if (isDevelopment()) {
        return 'http://localhost:3000';
    }
    if (isProduction()) {
        return 'https://www.biirbal.com';
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
    return linkId ? `${baseUrl}/#${linkId}` : `${baseUrl}/`;
}
