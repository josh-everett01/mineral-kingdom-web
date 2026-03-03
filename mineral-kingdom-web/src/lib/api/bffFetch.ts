// src/lib/api/bffFetch.ts
export type ApiError = {
  status: number;
  code?: string;
  message: string;
  details?: unknown;
};

function contentType(res: Response) {
  return (res.headers.get("content-type") ?? "").toLowerCase();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return typeof v === "string" ? v : undefined;
}

function pickMessage(body: unknown, fallback: string): { message: string; code?: string } {
  if (!isRecord(body)) return { message: fallback };

  const message = getString(body, "message") ?? getString(body, "error") ?? fallback;
  const code = getString(body, "code");

  return { message, code };
}

async function tryParseJson(res: Response): Promise<unknown | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * BFF-first fetch wrapper.
 * - JSON: returns typed JSON (T)
 * - Non-JSON (downloads/streams/CSV): returns raw Response
 * - Non-2xx: throws ApiError
 */
export async function bffFetch<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T | Response> {
  const res = await fetch(input, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.headers ?? {}),
    },
  });

  const ct = contentType(res);

  if (!res.ok) {
    const body: unknown =
      ct.includes("application/json") ? (await tryParseJson(res)) : await res.text().catch(() => "");

    const { message, code } = pickMessage(body, `Request failed (${res.status})`);

    const err: ApiError = {
      status: res.status,
      message,
      details: body,
      ...(code ? { code } : {}),
    };

    throw err;
  }

  // Downloads / streams / CSV
  if (!ct.includes("application/json")) {
    return res;
  }

  return (await res.json()) as T;
}