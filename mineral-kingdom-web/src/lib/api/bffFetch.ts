import { emitAuthExpired } from "@/lib/auth/clientSessionEvents"

export type ApiError = {
  status: number
  code?: string
  message: string
  details?: unknown
}

function contentType(res: Response) {
  return (res.headers.get("content-type") ?? "").toLowerCase()
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null
}

function getString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key]
  return typeof v === "string" ? v : undefined
}

function pickMessage(body: unknown, fallback: string): { message: string; code?: string } {
  if (!isRecord(body)) return { message: fallback }

  const message = getString(body, "message") ?? getString(body, "error") ?? fallback
  const code = getString(body, "code")

  return { message, code }
}

async function tryParseJson(res: Response): Promise<unknown | null> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export async function bffFetch<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T | Response> {
  const res = await fetch(input, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.headers ?? {}),
    },
  })

  const ct = contentType(res)

  if (!res.ok) {
    const body: unknown =
      ct.includes("application/json") ? await tryParseJson(res) : await res.text().catch(() => "")

    const { message, code } = pickMessage(body, `Request failed (${res.status})`)

    if (typeof window !== "undefined" && res.status === 401) {
      if (code === "AUTH_EXPIRED" || code === "UNAUTHORIZED" || !code) {
        emitAuthExpired(message)
      }
    }

    const err: ApiError = {
      status: res.status,
      message,
      details: body,
      ...(code ? { code } : {}),
    }

    throw err
  }

  if (!ct.includes("application/json")) {
    return res
  }

  return (await res.json()) as T
}