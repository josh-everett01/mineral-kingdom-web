import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080";

export async function GET(
  _req: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/api/pages/${encodeURIComponent(slug)}`, {
      method: "GET",
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { status: 503, message: "Pages service unavailable" },
      { status: 503 },
    );
  }

  if (upstream.status === 404) {
    return NextResponse.json({ code: "PAGE_NOT_FOUND" }, { status: 404 });
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