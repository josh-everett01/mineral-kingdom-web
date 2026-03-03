import * as React from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <LoginClient />
    </React.Suspense>
  );
}