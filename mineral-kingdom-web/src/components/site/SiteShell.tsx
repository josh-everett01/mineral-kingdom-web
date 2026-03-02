import * as React from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Header />
      <main className="min-h-[calc(100dvh-56px)]">{children}</main>
      <Footer />
    </div>
  );
}