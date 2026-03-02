"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/site/Container";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Container className="py-16">
      <h2 className="text-2xl font-semibold">Something went wrong</h2>
      <p className="mt-2 text-muted-foreground">
        Try again. If it keeps happening, we’ll add better diagnostics later.
      </p>

      <div className="mt-6 flex gap-3">
        <Button onClick={() => reset()}>Retry</Button>
        <Button variant="secondary" onClick={() => (window.location.href = "/")}>
          Go Home
        </Button>
      </div>

      <pre className="mt-6 overflow-auto rounded-md border bg-muted p-4 text-xs text-muted-foreground">
        {error?.message}
      </pre>
    </Container>
  );
}