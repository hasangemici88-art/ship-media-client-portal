import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { LoginForm } from "@/components/portal/LoginForm";
import { authIsConfigured, authOptions } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/client-portal");
  }

  return <LoginForm authConfigured={authIsConfigured()} />;
}
