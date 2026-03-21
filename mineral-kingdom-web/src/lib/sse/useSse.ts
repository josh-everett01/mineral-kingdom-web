"use client";

import * as React from "react";

type UseSseOptions<TSnapshot> = {
  parseSnapshot?: (data: string) => TSnapshot;
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
  } = opts;

  const parseSnapshotRef = React.useRef(parseSnapshot);

  React.useEffect(() => {
    parseSnapshotRef.current = parseSnapshot;
  }, [parseSnapshot]);

  const [connecting, setConnecting] = React.useState(false);
  const [connected, setConnected] = React.useState(false);
  const [snapshot, setSnapshot] = React.useState<TSnapshot | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [lastEventAt, setLastEventAt] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!url) {
      setConnecting(false);
      setConnected(false);
      return;
    }

    let cancelled = false;
    const es = new EventSource(url);

    setConnecting(true);
    setConnected(false);
    setError(null);

    es.onopen = () => {
      if (cancelled) return;
      setConnecting(false);
      setConnected(true);
      setError(null);
    };

    const handleSnapshot = (evt: Event) => {
      if (cancelled) return;

      const data = (evt as MessageEvent).data as string;

      try {
        const parsed = parseSnapshotRef.current(data);
        setSnapshot(parsed);
        setLastEventAt(Date.now());
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to parse snapshot");
      }
    };

    es.addEventListener("snapshot", handleSnapshot);

    es.onerror = () => {
      if (cancelled) return;

      // Native EventSource handles retry/reconnect automatically.
      setConnected(false);
      setConnecting(true);
    };

    return () => {
      cancelled = true;
      es.removeEventListener("snapshot", handleSnapshot);
      es.close();
    };
  }, [url]);

  return { connecting, connected, snapshot, error, lastEventAt };
}