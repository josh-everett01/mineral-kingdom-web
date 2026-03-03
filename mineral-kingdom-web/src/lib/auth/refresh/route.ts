import { NextResponse } from "next/server";
import { apiRefresh } from "@/lib/auth/api";
import { getRefreshToken, setAuthCookies, clearAuthCookies } from "@/lib/auth/cookies";

export async function POST() {
  const rt = await getRefreshToken();
  if (!rt) return NextResponse.json({ ok: false, message: "No refresh token" }, { status: 401 });

  try {
    const tokens = await apiRefresh(rt);
    await setAuthCookies(tokens);
    return NextResponse.json({ ok: true });
  } catch (err) {
    await clearAuthCookies();
    const message = err instanceof Error ? err.message : "Refresh failed";
    return NextResponse.json({ ok: false, message }, { status: 401 });
  }
}