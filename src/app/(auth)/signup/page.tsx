import { redirect } from "next/navigation";

// Self-registration is disabled. Accounts are created by admins only.
export default function SignupPage() {
  redirect("/login");
}
