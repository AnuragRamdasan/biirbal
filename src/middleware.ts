import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Allow access to public routes
        if (
          pathname.startsWith('/auth/') ||
          pathname.startsWith('/api/auth/') ||
          pathname === '/' ||
          pathname.startsWith('/pricing') ||
          pathname.startsWith('/privacy') ||
          pathname.startsWith('/contact') ||
          pathname.startsWith('/terms') ||
          pathname.startsWith('/_next') ||
          pathname.startsWith('/favicon') ||
          pathname.startsWith('/logo')
        ) {
          return true
        }

        // Protect dashboard and profile routes
        if (pathname.startsWith('/dashboard') || pathname.startsWith('/profile')) {
          return !!token
        }

        return true
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}