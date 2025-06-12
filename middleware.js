import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/login",
  },
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/articles/:path*",
    "/analytics/:path*",
    "/settings/:path*",
  ],
} 