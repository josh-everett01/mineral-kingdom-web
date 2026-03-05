"use client";

import * as React from "react";
import { useSse } from "@/lib/sse/useSse";
import { Container } from "@/components/site/Container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AuctionSnapshot = {
  AuctionId: string;
  CurrentPriceCents: number;
  BidCount: number;
  ReserveMet: boolean | null;
  Status: string;
  ClosingWindowEnd: string | null;
  MinimumNextBidCents: number | null;
};

function fmtMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function DevAuctionSseClient({ auctionId }: { auctionId: string }) {
  const url = `/api/bff/sse/auctions/${auctionId}`;

  const parseSnapshot = React.useCallback(
    (data: string) => JSON.parse(data) as AuctionSnapshot,
    []
  );

  const { connecting, connected, snapshot, error, lastEventAt } = useSse<AuctionSnapshot>(url, { parseSnapshot });

  return (
    <Container className="py-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Dev: Auction SSE</h1>
        <div className="flex items-center gap-2">
          <Badge variant={connected ? "default" : "secondary"}>
  {connected ? "Connected" : connecting ? "Connecting…" : "Disconnected"}
</Badge>
          {lastEventAt && (
            <span className="text-xs text-muted-foreground">
              last event: {new Date(lastEventAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          {!snapshot ? (
            <div className="text-sm text-muted-foreground">Waiting for snapshot…</div>
          ) : (
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Auction:</span> {snapshot.AuctionId}
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span> {snapshot.Status}
              </div>
              <div>
                <span className="text-muted-foreground">Current:</span> {fmtMoney(snapshot.CurrentPriceCents)}
              </div>
              <div>
                <span className="text-muted-foreground">Min next bid:</span>{" "}
                {snapshot.MinimumNextBidCents ? fmtMoney(snapshot.MinimumNextBidCents) : "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Bid count:</span> {snapshot.BidCount}
              </div>
              <div>
                <span className="text-muted-foreground">Reserve met:</span> {String(snapshot.ReserveMet)}
              </div>
              <pre className="mt-4 overflow-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(snapshot, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}