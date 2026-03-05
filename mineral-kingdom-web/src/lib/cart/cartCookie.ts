import { cookies } from "next/headers";

const CART_COOKIE = "mk_cart_id";
const isProd = process.env.NODE_ENV === "production";

export async function getCartId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(CART_COOKIE)?.value ?? null;
}

export async function setCartId(cartId: string) {
  const jar = await cookies();
  jar.set(CART_COOKIE, cartId, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
  });
}

export async function clearCartId() {
  const jar = await cookies();
  jar.set(CART_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 0,
  });
}