import { NextResponse } from 'next/server'

// Email confirmation is no longer used — redirect old links to login
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return NextResponse.redirect(new URL('/auth/login', baseUrl))
}
