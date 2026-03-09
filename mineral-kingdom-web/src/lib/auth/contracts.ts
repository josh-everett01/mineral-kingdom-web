import type { paths } from "@/lib/api/generated/openapi";

export type RegisterRequest =
  NonNullable<paths["/api/auth/register"]["post"]["requestBody"]>["content"]["application/json"];

export type RegisterResponse =
  paths["/api/auth/register"]["post"]["responses"][200]["content"]["application/json"];

export type VerifyEmailRequest =
  NonNullable<paths["/api/auth/verify-email"]["post"]["requestBody"]>["content"]["application/json"];

export type VerifyEmailResponse = {
  ok: true;
};

export type ResendVerificationRequest =
  NonNullable<paths["/api/auth/resend-verification"]["post"]["requestBody"]>["content"]["application/json"];

export type ResendVerificationResponse = {
  ok: true;
};

export type PasswordResetRequestRequest =
  NonNullable<
    paths["/api/auth/password-reset/request"]["post"]["requestBody"]
  >["content"]["application/json"];

export type PasswordResetRequestResponse = {
  ok: true;
  resetToken?: string;
};

export type PasswordResetConfirmRequest =
  NonNullable<
    paths["/api/auth/password-reset/confirm"]["post"]["requestBody"]
  >["content"]["application/json"];

export type PasswordResetConfirmResponse = {
  ok: true;
};