import { NextRequest, NextResponse } from "next/server"

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080"

type RouteContext = {
  params: Promise<{
    groupId: string
  }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { groupId } = await context.params

  const upstreamUrl = new URL(
    `/api/fulfillment-groups/${encodeURIComponent(groupId)}/events`,
    API_BASE_URL,
  )

  try {
    const upstream = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        Cookie: request.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    })

    if (!upstream.ok || !upstream.body) {
      const bodyText = await upstream.text().catch(() => "")
      return new NextResponse(bodyText || "Unable to connect to fulfillment events.", {
        status: upstream.status,
        headers: {
          "content-type": upstream.headers.get("content-type") ?? "text/plain; charset=utf-8",
          "cache-control": "no-store",
        },
      })
    }

    const headers = new Headers()
    headers.set("content-type", "text/event-stream")
    headers.set("cache-control", "no-cache, no-transform")
    headers.set("connection", "keep-alive")
    headers.set("x-accel-buffering", "no")

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    })
  } catch {
    return NextResponse.json(
      { message: "Unable to connect to fulfillment live updates." },
      { status: 502 },
    )
  }
}