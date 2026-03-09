import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getCurrentSession();

  if (!session.isAuthenticated) {
    return NextResponse.json(
      { isAuthenticated: false, user: null, roles: [] },
      { status: 401 },
    );
  }

  return NextResponse.json(session);
}