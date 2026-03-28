import { NextResponse } from "next/server"
import { apiRefresh } from "@/lib/auth/api"
import {
  clearAuthCookies,
  getRefreshToken,
  setAuthCookies,
} from "@/lib/auth/cookies"
import { getAccessTokenExpiresAtEpochSeconds } from "@/lib/auth/jwt"
import { sessionFromAccessToken } from "@/lib/auth/session"

const emptySession = {
  isAuthenticated: false,
  user: null,
  roles: [],
  accessTokenExpiresAtEpochSeconds: null,
}

function buildAuthMe(accessToken: string) {
  const session = sessionFromAccessToken(accessToken)

  return {
    ...session,
    accessTokenExpiresAtEpochSeconds: getAccessTokenExpiresAtEpochSeconds(accessToken),
  }
}

export async function POST() {
  const refresh = await getRefreshToken()

  if (!refresh) {
    await clearAuthCookies()

    return NextResponse.json(
      {
        ...emptySession,
        code: "AUTH_EXPIRED",
        message: "Your session expired. Please sign in again.",
      },
      {
        status: 401,
        headers: {
          "cache-control": "no-store",
        },
      },
    )
  }

  try {
    const tokens = await apiRefresh(refresh)
    await setAuthCookies(tokens)

    return NextResponse.json(buildAuthMe(tokens.access_token), {
      headers: {
        "cache-control": "no-store",
      },
    })
  } catch {
    await clearAuthCookies()

    return NextResponse.json(
      {
        ...emptySession,
        code: "AUTH_EXPIRED",
        message: "Your session expired. Please sign in again.",
      },
      {
        status: 401,
        headers: {
          "cache-control": "no-store",
        },
      },
    )
  }
}