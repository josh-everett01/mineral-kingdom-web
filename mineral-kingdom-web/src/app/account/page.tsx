"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/site/Container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/useAuth";

export default function AccountPage() {
  const router = useRouter();
  const { me, isLoading, logout } = useAuth();

  async function onLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <Container className="py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <Button variant="secondary" onClick={onLogout}>
          Logout
        </Button>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <>
              <div>
                <span className="text-muted-foreground">Authenticated:</span>{" "}
                <span className="font-medium">{me.isAuthenticated ? "Yes" : "No"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>{" "}
                <span className="font-medium">{me.user?.email ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">UserId:</span>{" "}
                <span className="font-medium">{me.user?.id ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Roles:</span>{" "}
                <span className="font-medium">{me.roles.join(", ") || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Email Verified:</span>{" "}
                <span className="font-medium">
                  {me.emailVerified === undefined ? "—" : me.emailVerified ? "Yes" : "No"}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}