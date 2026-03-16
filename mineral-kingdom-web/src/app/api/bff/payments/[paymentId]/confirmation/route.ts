import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL;

type RouteContext = {
  params: Promise<{
    paymentId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { message: "API base URL is not configured." },
      { status: 500 },
    );
  }

  const { paymentId } = await context.params;

  const upstreamUrl = new URL(
    `/api/payments/${paymentId}/confirmation`,
    API_BASE_URL,
  );

  try {
    const upstream = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const contentType = upstream.headers.get("content-type") ?? "application/json";
    const bodyText = await upstream.text();

    return new NextResponse(bodyText, {
      status: upstream.status,
      headers: {
        "content-type": contentType,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Unable to load payment confirmation state." },
      { status: 502 },
    );
  }
}