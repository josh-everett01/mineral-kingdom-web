import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { apiRefresh } from "@/lib/auth/api";
import {
  getAccessToken,
  getRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from "@/lib/auth/cookies";
import { getCartId, setCartId } from "@/lib/cart/cartCookie";
import { toProxyError } from "@/lib/api/proxyError";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080";

type RouteCtx = { params: Promise<{ path: string[] }> };

function isCartOrCheckout(upstreamPath: string) {
  return upstreamPath.startsWith("/api/cart") || upstreamPath.startsWith("/api/checkout");
}

function contentType(res: Response) {
  return (res.headers.get("content-type") ?? "").toLowerCase();
}

async function readBodyForError(res: Response): Promise<unknown> {
  const ct = contentType(res);
  if (ct.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  try {
    return await res.text();
  } catch {
    return null;
  }
}

async function forwardOnce(req: NextRequest, upstreamUrl: string, accessToken: string | null) {
  const headers = new Headers(req.headers);

  // Remove hop-by-hop headers and ones we control
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("cookie"); // important: never forward browser cookies to API

  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`);
  } else {
    headers.delete("authorization");
  }

  const upstreamPath = new URL(upstreamUrl).pathname;

  // Cart bridging: attach X-Cart-Id only for cart/checkout routes
  if (isCartOrCheckout(upstreamPath)) {
    const cartId = await getCartId();
    if (cartId) headers.set("x-cart-id", cartId);
    else headers.delete("x-cart-id");
  } else {
    headers.delete("x-cart-id");
  }

  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  const init: RequestInit = {
    method: req.method,
    headers,
    body: hasBody ? req.body : undefined,
    redirect: "manual",
    // Needed when proxying ReadableStream bodies in Node runtime
    ...(hasBody ? ({ duplex: "half" } as unknown as RequestInit) : {}),
  };

  return fetch(upstreamUrl, init);
}

async function proxy(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;

  const incoming = new URL(req.url);
  const upstreamPath = `/api/${path.join("/")}`;
  const upstreamUrl = `${API_BASE_URL}${upstreamPath}${incoming.search}`;

  // First attempt
  let access = await getAccessToken();
  let res = await forwardOnce(req, upstreamUrl, access);

  // 401 -> refresh -> retry once
  if (res.status === 401) {
    const refresh = await getRefreshToken();
    if (refresh) {
      try {
        const tokens = await apiRefresh(refresh);
        await setAuthCookies(tokens);
        access = tokens.access_token;
        res = await forwardOnce(req, upstreamUrl, access);
      } catch {
        await clearAuthCookies();
      }
    }
  }

  // Persist X-Cart-Id only for cart/checkout routes
  const upstreamCartId = res.headers.get("x-cart-id");
  if (upstreamCartId && isCartOrCheckout(upstreamPath)) {
    await setCartId(upstreamCartId);
  }

  // Standardize errors
  if (!res.ok) {
    const body = await readBodyForError(res);
    const err = toProxyError(res.status, body, `Upstream request failed (${res.status})`);
    return NextResponse.json(err, { status: res.status });
  }

  // Pass-through headers (sanitize a few)
  const outHeaders = new Headers(res.headers);

  // Helpful for debugging/tests
  if (upstreamCartId) outHeaders.set("x-cart-id", upstreamCartId);

  outHeaders.delete("content-encoding");
  outHeaders.delete("transfer-encoding");
  outHeaders.delete("connection");

  const ct = contentType(res);

  // JSON response
  if (ct.includes("application/json")) {
    const json = await res.json();
    return NextResponse.json(json, { status: res.status, headers: outHeaders });
  }

  // download/stream response
  return new NextResponse(res.body, { status: res.status, headers: outHeaders });
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx);
}
export async function POST(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx);
}
export async function PUT(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx);
}