import { notFound, redirect } from "next/navigation";
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
    // Temporary forbidden behavior until FE-1.3.2 introduces dedicated 403 UX
    notFound();
  }

  return session;
}