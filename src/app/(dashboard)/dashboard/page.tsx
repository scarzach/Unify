import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceMembershipOrRedirect } from "@/lib/workspaces";
import { 
  Car, 
  FolderOpen,
  Link2,
  Wallet,
  TrendingUp, 
  Clock,
  ArrowUpRight,
  Plus,
  FileUp
} from "lucide-react";
import Link from "next/link";
import { formatBytes } from "@/lib/sharing";

function isActiveLink(link: {
  revokedAt: Date | null;
  expiresAt: Date | null;
  isBurned: boolean;
  viewLimit: number | null;
  viewCount: number;
}) {
  if (link.revokedAt || link.isBurned) {
    return false;
  }

  if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) {
    return false;
  }

  if (link.viewLimit && link.viewCount >= link.viewLimit) {
    return false;
  }

  return true;
}

export default async function DashboardPage() {
  const { user, workspace } = await getCurrentWorkspaceMembershipOrRedirect();

  const [vehicleCount, filesSummary, allShareLinks, transactionCount, recentVehicles, recentLinks] = await Promise.all([
    prisma.vehicle.count({
      where: { workspaceId: workspace.id },
    }),
    prisma.file.aggregate({
      where: { workspaceId: workspace.id },
      _count: { id: true },
      _sum: { sizeBytes: true },
    }),
    prisma.secretLink.findMany({
      where: { workspaceId: workspace.id },
      select: {
        revokedAt: true,
        expiresAt: true,
        isBurned: true,
        viewLimit: true,
        viewCount: true,
      },
    }),
    prisma.financialTransaction.count({
      where: { workspaceId: workspace.id },
    }),
    prisma.vehicle.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        nickname: true,
        make: true,
        model: true,
        year: true,
        createdAt: true,
      },
    }),
    prisma.secretLink.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        slug: true,
        createdAt: true,
        revokedAt: true,
        isBurned: true,
      },
    }),
  ]);

  const activeShareCount = allShareLinks.filter(isActiveLink).length;
  const fileCount = filesSummary._count.id;
  const storageUsed = formatBytes(filesSummary._sum.sizeBytes ?? 0);

  const stats = [
    { name: "Vehicles", value: vehicleCount.toString(), icon: Car, color: "text-blue-600", bg: "bg-blue-100", href: "/garage" },
    { name: "Uploaded Files", value: fileCount.toString(), icon: FolderOpen, color: "text-violet-600", bg: "bg-violet-100", href: "/sharing" },
    { name: "Active Links", value: activeShareCount.toString(), icon: Link2, color: "text-emerald-600", bg: "bg-emerald-100", href: "/sharing" },
    { name: "Transactions", value: transactionCount.toString(), icon: Wallet, color: "text-amber-600", bg: "bg-amber-100", href: "/saas" },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user.name || user.email}</h1>
        <p className="text-muted-foreground mt-1">Here's an overview of your Personal OS.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href} className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.bg} ${stat.color} p-2 rounded-lg`}>
                <stat.icon size={20} />
              </div>
              <ArrowUpRight size={16} className="text-gray-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold">{stat.value}</span>
              <span className="text-sm text-muted-foreground">{stat.name}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Clock size={20} className="text-blue-600" />
            Recent Vehicles
          </h2>
          {recentVehicles.length === 0 ? (
            <p className="rounded-lg bg-gray-50 p-4 text-sm text-muted-foreground dark:bg-zinc-800/50">
              No vehicles yet. Use the garage to add your first one.
            </p>
          ) : (
            <div className="space-y-4">
              {recentVehicles.map((vehicle) => (
                <div key={vehicle.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-zinc-800/50">
                  <div>
                    <p className="text-sm font-medium">{vehicle.nickname || `${vehicle.year} ${vehicle.make}`}</p>
                    <p className="text-xs text-muted-foreground">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                  </div>
                  <Link href={`/garage/${vehicle.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                    Open
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-200 dark:border-zinc-800">
          <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/garage" className="p-4 text-left border rounded-lg hover:border-blue-500 transition-colors">
              <div className="flex items-center gap-2">
                <Plus size={16} className="text-blue-600" />
                <p className="font-bold text-sm">Open Garage</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Add a vehicle or review logs</p>
            </Link>
            <Link href="/sharing" className="p-4 text-left border rounded-lg hover:border-blue-500 transition-colors">
              <div className="flex items-center gap-2">
                <FileUp size={16} className="text-blue-600" />
                <p className="font-bold text-sm">Share File</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Upload and create a secure link</p>
            </Link>
          </div>

          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Sharing Snapshot</h3>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-zinc-800/50">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Storage Used</p>
                <p className="mt-1 text-lg font-semibold">{storageUsed}</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-zinc-800/50">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Recent Links</p>
                <p className="mt-1 text-lg font-semibold">{recentLinks.length}</p>
              </div>
            </div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent Links</h3>
            {recentLinks.length === 0 ? (
              <p className="rounded-lg bg-gray-50 p-4 text-sm text-muted-foreground dark:bg-zinc-800/50">
                No share links created yet.
              </p>
            ) : (
              <div className="space-y-3">
                {recentLinks.map((link) => (
                  <div key={link.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-zinc-800/50">
                    <div>
                      <p className="text-sm font-medium">{link.title || `/s/${link.slug}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {link.revokedAt ? "Revoked" : link.isBurned ? "Consumed" : "Active"} • /s/{link.slug}
                      </p>
                    </div>
                    <Link href="/sharing" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                      Open
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
