"use client";

import * as React from "react";

type UseSseOptions<TSnapshot> = {
  parseSnapshot?: (data: string) => TSnapshot;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
};

type UseSseResult<TSnapshot> = {
  connecting: boolean;
  connected: boolean;
  snapshot: TSnapshot | null;
  error: string | null;
  lastEventAt: number | null;
};

export function useSse<TSnapshot = unknown>(
  url: string | null,
  opts: UseSseOptions<TSnapshot> = {}
): UseSseResult<TSnapshot> {
  const {
    parseSnapshot = (d: string) => JSON.parse(d) as TSnapshot,
    initialBackoffMs = 500,
    maxBackoffMs = 10_000,
  } = opts;

  const [connecting, setConnecting] = React.useState(false);
  const [connected, setConnected] = React.useState(false);
  const [snapshot, setSnapshot] = React.useState<TSnapshot | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [lastEventAt, setLastEventAt] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!url) return;

    let es: EventSource | null = null;
    let cancelled = false;

    let backoff = initialBackoffMs;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
      try {
        es?.close();
      } catch {}
      es = null;
    };

    const scheduleReconnect = () => {
      cleanup();

      // we are not connected while waiting to retry
      setConnected(false);
      setConnecting(true);

      retryTimer = setTimeout(() => {
        backoff = Math.min(maxBackoffMs, Math.floor(backoff * 1.8));
        connect();
      }, backoff);
    };

    const connect = () => {
      if (cancelled) return;

      setError(null);
      setConnecting(true);

      // IMPORTANT: EventSource sends cookies automatically (same-origin),
      // which is why the BFF can attach Authorization server-side.
      es = new EventSource(url);

      es.onopen = () => {
        if (cancelled) return;
        setConnecting(false);
        setConnected(true);
        backoff = initialBackoffMs;
      };

      es.addEventListener("snapshot", (evt) => {
        if (cancelled) return;
        const data = (evt as MessageEvent).data as string;

        try {
          const parsed = parseSnapshot(data);
          setSnapshot(parsed);
          setLastEventAt(Date.now());
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to parse snapshot");
        }
      });

      es.onerror = () => {
        if (cancelled) return;
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      cancelled = true;
      setConnecting(false);
      setConnected(false);
      cleanup();
    };
  }, [url, initialBackoffMs, maxBackoffMs, parseSnapshot]);

  return { connecting, connected, snapshot, error, lastEventAt };
}