"use client";

import * as React from "react";
import { Container } from "@/components/site/Container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DevCartPage() {
  const [result, setResult] = React.useState<unknown>(null);
  const [cartId, setCartId] = React.useState<string | null>(null);

  async function loadCart() {
    const res = await fetch("/api/bff/proxy/cart", { cache: "no-store" });
    setCartId(res.headers.get("x-cart-id"));
    const json = await res.json().catch(() => null);
    setResult(json);
  }

  return (
    <Container className="py-10">
      <Card>
        <CardHeader>
          <CardTitle>Dev Cart Probe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={loadCart}>GET Cart via BFF Proxy</Button>
          <div className="text-sm">
            <span className="text-muted-foreground">X-Cart-Id:</span>{" "}
            <span className="font-medium">{cartId ?? "—"}</span>
          </div>
          <pre className="overflow-auto rounded-md border bg-muted p-3 text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </Container>
  );
}