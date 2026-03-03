import { NextResponse } from "next/server";
import { apiLogin } from "@/lib/auth/api";
import { setAuthCookies } from "@/lib/auth/cookies";

export async function POST(req: Request) {
  const body = (await req.json()) as { email: string; password: string };

  try {
    const tokens = await apiLogin(body);
    await setAuthCookies(tokens);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ ok: false, message }, { status: 401 });
  }
}