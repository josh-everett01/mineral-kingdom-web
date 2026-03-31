import { NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080"

export async function GET(request: NextRequest) {
  const upstreamUrl = new URL("/api/me/open-box/shipping-invoice", API_BASE_URL)

  try {
    const upstream = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Cookie: request.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    })

    const contentType = upstream.headers.get("content-type") ?? "application/json"
    const bodyText = await upstream.text()

    return new NextResponse(bodyText, {
      status: upstream.status,
      headers: {
        "content-type": contentType,
        "cache-control": "no-store",
      },
    })
  } catch {
    return NextResponse.json(
      { message: "Unable to load open box shipping invoice." },
      { status: 502 },
    )
  }
}