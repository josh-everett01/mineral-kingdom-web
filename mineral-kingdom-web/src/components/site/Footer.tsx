import { Container } from "@/components/site/Container";

export function Footer() {
  return (
    <footer className="border-t">
      <Container className="flex flex-col gap-2 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <span>© {new Date().getFullYear()} Mineral Kingdom</span>
        <span className="text-xs">Built with Next.js + Tailwind + shadcn/ui</span>
      </Container>
    </footer>
  );
}