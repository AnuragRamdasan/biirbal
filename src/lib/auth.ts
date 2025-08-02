// Authentication utility functions
export interface AuthUser {
  id: string
  name?: string
  email?: string
  teamId?: string
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  const userId = localStorage.getItem('biirbal_user_id')
  return !!userId
}

// Get current user ID
export function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('biirbal_user_id')
}

// Get current user data
export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const userId = localStorage.getItem('biirbal_user_id')
  if (!userId) return null
  
  return {
    id: userId,
    name: localStorage.getItem('biirbal_user_name') || undefined,
    email: localStorage.getItem('biirbal_user_email') || undefined,
    teamId: localStorage.getItem('biirbal_team_id') || undefined,
  }
}

// Set user authentication data
export function setUserAuth(userId: string, userData?: Partial<AuthUser>): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('biirbal_user_id', userId)
  
  if (userData?.name) {
    localStorage.setItem('biirbal_user_name', userData.name)
  }
  if (userData?.email) {
    localStorage.setItem('biirbal_user_email', userData.email)
  }
  if (userData?.teamId) {
    localStorage.setItem('biirbal_team_id', userData.teamId)
  }
}

// Clear user authentication data
export function clearUserAuth(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('biirbal_user_id')
  localStorage.removeItem('biirbal_user_name')
  localStorage.removeItem('biirbal_user_email')
  localStorage.removeItem('biirbal_team_id')
}

// Define public and private routes
export const PUBLIC_ROUTES = [
  '/',
  '/pricing',
  '/contact',
  '/privacy',
  '/terms',
  '/blog',
  '/success',
  '/invite',
  '/api',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
]

export const PRIVATE_ROUTES = [
  '/dashboard',
  '/profile',
  '/team',
  '/debug-team',
]

// Check if a route is public
export function isPublicRoute(pathname: string): boolean {
  // Check exact matches
  if (PUBLIC_ROUTES.includes(pathname)) return true
  
  // Check if it starts with any public route
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}

// Check if a route is private
export function isPrivateRoute(pathname: string): boolean {
  return PRIVATE_ROUTES.some(route => pathname.startsWith(route))
}

// Redirect to home page
export function redirectToHome(): void {
  if (typeof window !== 'undefined') {
    window.location.href = '/'
  }
} 