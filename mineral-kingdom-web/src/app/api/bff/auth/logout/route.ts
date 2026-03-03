import { NextResponse } from "next/server";
import { apiLogout } from "@/lib/auth/api";
import { getRefreshToken, clearAuthCookies } from "@/lib/auth/cookies";

export async function POST() {
  const rt = await getRefreshToken();

  try {
    if (rt) await apiLogout(rt);
  } finally {
    await clearAuthCookies();
  }

  return NextResponse.json({ ok: true });
}