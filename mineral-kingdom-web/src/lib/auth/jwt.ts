type JwtPayload = Record<string, unknown>;

function base64UrlDecode(input: string) {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const base64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf8");
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(base64UrlDecode(parts[1])) as JwtPayload;
  } catch {
    return null;
  }
}

// Helpers to extract common claim shapes.
// Adjust keys if your API uses different claim names.
export function extractEmail(payload: JwtPayload): string | undefined {
  return (payload["email"] as string | undefined) ?? (payload["unique_name"] as string | undefined);
}

export function extractUserId(payload: JwtPayload): string | undefined {
  return (payload["sub"] as string | undefined) ?? (payload["nameidentifier"] as string | undefined);
}

export function extractRoles(payload: JwtPayload): string[] {
  const roles =
    (payload["role"] as string | string[] | undefined) ??
    (payload["roles"] as string | string[] | undefined);

  if (!roles) return [];
  return Array.isArray(roles) ? roles : [roles];
}

export function extractEmailVerified(payload: JwtPayload): boolean | undefined {
  const v = payload["email_verified"];
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.toLowerCase() === "true";
  return undefined;
}