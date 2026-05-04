import { redirect } from "next/navigation"

export default function ResetPasswordLegacyPage() {
  redirect("/password-reset/request")
}