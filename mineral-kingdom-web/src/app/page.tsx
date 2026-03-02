import Link from "next/link";
import { Container } from "@/components/site/Container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <Container className="py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Mineral Kingdom</h1>
        <p className="text-muted-foreground">
          Fixed-price store + auctions. This is the foundation shell (S9-0).
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Shop</CardTitle>
            <CardDescription>Browse fixed-price listings.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href="/shop">Go to Shop</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auctions</CardTitle>
            <CardDescription>Watch live auctions and bid (members).</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href="/auctions">Go to Auctions</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Login and manage your dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}