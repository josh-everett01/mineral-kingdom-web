export type ProxyError = {
  status: number;
  code?: string;
  message: string;
  details?: unknown;
};

export function toProxyError(status: number, body: unknown, fallback: string): ProxyError {
  if (typeof body === "object" && body !== null) {
    const rec = body as Record<string, unknown>;
    const message = typeof rec.message === "string" ? rec.message : fallback;
    const code = typeof rec.code === "string" ? rec.code : undefined;
    return { status, message, code, details: body };
  }

  if (typeof body === "string" && body.length > 0) {
    return { status, message: body };
  }

  return { status, message: fallback };
}