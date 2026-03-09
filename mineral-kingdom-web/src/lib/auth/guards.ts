import { redirect } from "next/navigation";
import { getCurrentSession, hasAnyRole, type AppSession } from "@/lib/auth/session";

function buildLoginRedirect(targetPath: string) {
  const encoded = encodeURIComponent(targetPath);
  return `/login?next=${encoded}`;
}

export async function requireAuth(targetPath: string): Promise<AppSession> {
  const session = await getCurrentSession();

  if (!session.isAuthenticated) {
    redirect(buildLoginRedirect(targetPath));
  }

  return session;
}

export async function requireRole(
  allowedRoles: readonly string[],
  targetPath: string,
): Promise<AppSession> {
  const session = await requireAuth(targetPath);

  if (!hasAnyRole(session, allowedRoles)) {
    redirect("/403");
  }

  return session;
}