import Link from "next/link";
import {
  LayoutDashboard,
  Car,
  ShieldCheck,
  Zap,
  LogOut,
  User,
  Users,
} from "lucide-react";
import { signOut } from "@/auth";
import { setActiveWorkspace } from "@/lib/actions/workspaces";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Digital Garage", href: "/garage", icon: Car },
  { name: "Secure Sharing", href: "/sharing", icon: ShieldCheck },
  { name: "Mini SaaS", href: "/saas", icon: Zap },
  { name: "Workspace", href: "/workspaces", icon: Users },
];

export default function Sidebar({
  userEmail,
  userName,
  activeWorkspaceId,
  workspaces,
}: {
  userEmail?: string | null;
  userName?: string | null;
  activeWorkspaceId: string;
  workspaces: Array<{ id: string; name: string; isPersonal: boolean }>;
}) {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 transition-transform">
      <div className="flex h-full flex-col px-3 py-4">
        <Link href="/dashboard" className="mb-10 px-2 flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <ShieldCheck className="text-white" size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight">Unify</span>
        </Link>

        <nav className="flex-1 space-y-1">
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/80">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Active workspace
            </p>
            <form action={setActiveWorkspace} className="space-y-2">
              <select
                name="workspaceId"
                defaultValue={activeWorkspaceId}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}{workspace.isPersonal ? " (Personal)" : ""}
                  </option>
                ))}
              </select>
              <button className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
                Switch
              </button>
            </form>
          </div>

          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center rounded-lg p-2 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <item.icon className="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:group-hover:text-white" />
              <span className="ml-3 font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-gray-100 dark:border-zinc-800 pt-4 px-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
              <User size={18} className="text-gray-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold truncate max-w-[140px]">{userName}</span>
              <span className="text-xs text-muted-foreground truncate max-w-[140px]">{userEmail}</span>
            </div>
          </div>
          
          <form action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}>
            <button className="flex w-full items-center rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/10 dark:hover:text-red-500 transition-colors">
              <LogOut size={20} />
              <span className="ml-3 font-medium">Log Out</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
