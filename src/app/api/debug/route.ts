import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const debugInfo = {
    requestUrl: request.url,
    origin: request.nextUrl.origin,
    host: request.nextUrl.host,
    hostname: request.nextUrl.hostname,
    protocol: request.nextUrl.protocol,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    VERCEL_URL: process.env.VERCEL_URL,
    NODE_ENV: process.env.NODE_ENV,
    headers: {
      host: request.headers.get('host'),
      'x-forwarded-host': request.headers.get('x-forwarded-host'),
      'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
    }
  }

  return NextResponse.json(debugInfo, { status: 200 })
}