import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ClientPortalDashboard } from "@/components/portal/ClientPortalDashboard";
import { authOptions } from "@/lib/auth";

export default async function ClientPortalPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return <ClientPortalDashboard userName={session.user?.name || "Portal user"} />;
}
