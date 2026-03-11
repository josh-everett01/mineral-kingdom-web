import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080";

export async function GET() {
  let upstream: Response;

  try {
    upstream = await fetch(`${API_BASE_URL}/api/home/sections`, {
      method: "GET",
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { status: 503, message: "Home sections service unavailable" },
      { status: 503 },
    );
  }

  const text = await upstream.text().catch(() => "");

  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}