import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const existing = await getSessionUser();
  if (existing) redirect("/");
  return <LoginForm />;
}
