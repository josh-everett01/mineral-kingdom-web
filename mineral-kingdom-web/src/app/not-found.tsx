import Link from "next/link";
import { Container } from "@/components/site/Container";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Container className="py-16">
      <h2 className="text-2xl font-semibold">Page not found</h2>
      <p className="mt-2 text-muted-foreground">
        That route doesn’t exist (yet).
      </p>
      <div className="mt-6">
        <Button asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </Container>
  );
}