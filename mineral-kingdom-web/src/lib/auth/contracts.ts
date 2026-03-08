import type { paths } from "@/lib/api/generated/openapi";

export type RegisterRequest =
  NonNullable<paths["/api/auth/register"]["post"]["requestBody"]>["content"]["application/json"];

export type RegisterResponse =
  paths["/api/auth/register"]["post"]["responses"][200]["content"]["application/json"];