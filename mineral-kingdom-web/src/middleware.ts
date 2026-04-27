import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const ACCESS_COOKIE = "mk_access"
const REFRESH_COOKIE = "mk_refresh"

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const hasAccess = req.cookies.get(ACCESS_COOKIE)?.value
  const hasRefresh = req.cookies.get(REFRESH_COOKIE)?.value

  if (!hasAccess && !hasRefresh) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
