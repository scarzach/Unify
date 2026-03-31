import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import { getCurrentWorkspaceMembershipOrRedirect } from "@/lib/workspaces";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { workspace, memberships } = await getCurrentWorkspaceMembershipOrRedirect();

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 overflow-hidden">
      <Sidebar
        userEmail={session.user.email}
        userName={session.user.name}
        activeWorkspaceId={workspace.id}
        workspaces={memberships.map((membership) => ({
          id: membership.workspace.id,
          name: membership.workspace.name,
          isPersonal: membership.workspace.isPersonal,
        }))}
      />
      <main className="flex-1 ml-64 overflow-y-auto p-4 md:p-8 bg-gray-50/50 dark:bg-zinc-950/50">
        {children}
      </main>
    </div>
  );
}
