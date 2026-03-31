import CopyShareLinkButton from "@/components/dashboard/CopyShareLinkButton";
import ConfirmSubmitButton from "@/components/dashboard/ConfirmSubmitButton";
import {
  createShareLink,
  deleteSharedFile,
  revokeShareLink,
  uploadSharedFile,
} from "@/lib/actions/sharing";
import { prisma } from "@/lib/prisma";
import { formatBytes, formatDateTime, formatRelativeTime } from "@/lib/sharing";
import { getCurrentWorkspaceMembershipOrRedirect, hasWorkspacePermission } from "@/lib/workspaces";
import {
  Clock3,
  CopyPlus,
  Download,
  FolderOpen,
  Link2,
  ShieldCheck,
  ShieldX,
  Trash2,
  Upload,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";

type SharingPageProps = {
  searchParams: Promise<{
    status?: string;
    error?: string;
  }>;
};

function getBaseUrl(host: string | null) {
  if (!host) {
    return process.env.NEXTAUTH_URL ?? "";
  }

  return `${host.includes("localhost") ? "http" : "https"}://${host}`;
}

function getFlashMessage(status?: string, error?: string) {
  if (error === "missing-file") return { tone: "error", text: "Choose a file before creating a share." };
  if (error === "file-too-large") return { tone: "error", text: "Files are currently limited to 25 MB." };
  if (error === "missing-link" || error === "link-not-found") return { tone: "error", text: "That share link could not be found." };
  if (error === "file-not-found") return { tone: "error", text: "That file could not be found." };
  if (status === "uploaded") return { tone: "success", text: "File uploaded and share data refreshed." };
  if (status === "link-created") return { tone: "success", text: "A new share link was created." };
  if (status === "link-revoked") return { tone: "success", text: "The share link has been revoked." };
  if (status === "file-deleted") return { tone: "success", text: "The file and its share links were deleted." };
  return null;
}

function getLinkState(link: {
  revokedAt: Date | null;
  expiresAt: Date | null;
  isBurned: boolean;
  viewLimit: number | null;
  viewCount: number;
}) {
  if (link.revokedAt) return "Revoked";
  if (link.isBurned) return "Consumed";
  if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) return "Expired";
  if (link.viewLimit && link.viewCount >= link.viewLimit) return "Limit reached";
  return "Active";
}

export default async function SharingPage({ searchParams }: SharingPageProps) {
  const { user, workspace, membership } = await getCurrentWorkspaceMembershipOrRedirect();
  const { status, error } = await searchParams;
  const flashMessage = getFlashMessage(status, error);
  const headerList = await headers();
  const baseUrl = getBaseUrl(headerList.get("host"));
  const canWriteSharing = hasWorkspacePermission(membership.role, "sharing:write");
  const canDeleteSharing = hasWorkspacePermission(membership.role, "sharing:delete");

  const [files, secretLinks, recentActivities] = await Promise.all([
    prisma.file.findMany({
      where: { workspaceId: workspace.id },
      include: {
        secretLinks: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.secretLink.findMany({
      where: { workspaceId: workspace.id },
      include: { file: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.fileActivity.findMany({
      where: { workspaceId: workspace.id },
      include: { file: true, secretLink: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const totalStorage = files.reduce((total, file) => total + file.sizeBytes, 0);
  const activeLinks = secretLinks.filter((link) => getLinkState(link) === "Active").length;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 text-stone-50 shadow-2xl shadow-black/20">
        <h1 className="text-3xl font-bold tracking-tight">Secure Sharing</h1>
        <p className="mt-2 max-w-3xl text-sm text-stone-300 md:text-base">
          Files, links, and activity for {user.name || user.email}. Upload files, copy public share URLs,
          revoke links, or delete uploads entirely.
        </p>
      </header>

      {flashMessage ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            flashMessage.tone === "error"
              ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300"
              : "border-green-200 bg-green-50 text-green-800 dark:border-green-900/30 dark:bg-green-900/20 dark:text-green-300"
          }`}
        >
          {flashMessage.text}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Uploaded Files</p>
          <p className="text-3xl font-bold mt-2">{files.length}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Links</p>
          <p className="text-3xl font-bold mt-2">{activeLinks}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Storage Used</p>
          <p className="text-3xl font-bold mt-2">{formatBytes(totalStorage)}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.05fr_1.45fr]">
        <div className="space-y-8">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
              <Upload className="text-blue-500" size={20} />
              Upload and share
            </h2>
            <form action={uploadSharedFile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="file">File</label>
                <input id="file" name="file" type="file" required className="w-full text-sm border rounded-lg bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="note">Internal note</label>
                <textarea id="note" name="note" rows={2} className="w-full text-sm border rounded-lg bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 p-2" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1.5" htmlFor="expiryHours">Expiry</label>
                  <select id="expiryHours" name="expiryHours" defaultValue="72" className="w-full text-sm border rounded-lg bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 p-2">
                    <option value="">No expiry</option>
                    <option value="24">24 hours</option>
                    <option value="72">72 hours</option>
                    <option value="168">7 days</option>
                    <option value="720">30 days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" htmlFor="viewLimit">Max downloads</label>
                  <input id="viewLimit" name="viewLimit" type="number" min="1" className="w-full text-sm border rounded-lg bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 p-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="password">Password</label>
                <input id="password" name="password" type="password" className="w-full text-sm border rounded-lg bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 p-2" />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" name="createLink" defaultChecked className="rounded border-gray-300" />
                Create a share link immediately
              </label>
              <button
                disabled={!canWriteSharing}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                <Upload size={18} />
                Upload File
              </button>
            </form>
            {!canWriteSharing ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Your workspace role is read-only for sharing uploads and link changes.
              </p>
            ) : null}
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
              <Clock3 className="text-amber-500" size={20} />
              Recent Activity
            </h2>
            <div className="space-y-3">
              {recentActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No activity yet.</p>
              ) : recentActivities.map((activity) => (
                <div key={activity.id} className="p-3 border dark:border-zinc-800 rounded-lg bg-gray-50 dark:bg-zinc-800/50">
                  <p className="text-sm font-bold">{activity.message || activity.type}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.file?.filename || activity.secretLink?.title || "Sharing event"} • {formatRelativeTime(activity.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/50 flex items-center gap-2">
              <FolderOpen size={20} className="text-blue-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Your files</h2>
            </div>
            <div className="divide-y dark:divide-zinc-800">
              {files.length === 0 ? (
                <p className="p-8 text-sm text-muted-foreground text-center">No files yet.</p>
              ) : files.map((file) => {
                const latestLink = file.secretLinks[0];
                const latestLinkUrl = latestLink ? `${baseUrl}/s/${latestLink.slug}` : null;

                return (
                  <div key={file.id} className="p-5 flex flex-col gap-4 group hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{file.filename}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatBytes(file.sizeBytes)} • {formatDateTime(file.createdAt)}</p>
                        {file.note ? <p className="text-sm text-muted-foreground mt-2">{file.note}</p> : null}
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <a href={`/api/sharing/files/${file.id}`} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-100 dark:border-zinc-700 dark:hover:bg-zinc-800" title="Download">
                          <Download size={16} />
                          Download
                        </a>
                        {canWriteSharing ? (
                          <form action={createShareLink}>
                            <input type="hidden" name="fileId" value={file.id} />
                            <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
                              <CopyPlus size={16} />
                              New link
                            </button>
                          </form>
                        ) : null}
                        {canDeleteSharing ? (
                          <form action={deleteSharedFile}>
                            <input type="hidden" name="fileId" value={file.id} />
                            <ConfirmSubmitButton
                              confirmMessage={`Delete ${file.filename}? This removes the file, its share links, and related activity.`}
                              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900/30 dark:text-red-300 dark:hover:bg-red-900/20"
                            >
                              <Trash2 size={16} />
                              Delete
                            </ConfirmSubmitButton>
                          </form>
                        ) : null}
                      </div>
                    </div>

                    {latestLink && latestLinkUrl ? (
                      <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 dark:border-blue-900/30 dark:bg-blue-900/20">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                              <Link2 size={14} />
                              Share link
                            </div>
                            <p className="mt-1 break-all text-xs text-blue-700/80 dark:text-blue-200/80">{latestLinkUrl}</p>
                            <p className="mt-1 text-xs text-blue-700/80 dark:text-blue-200/80">
                              {getLinkState(latestLink)} • {latestLink.viewCount}
                              {latestLink.viewLimit ? ` / ${latestLink.viewLimit}` : ""} downloads used
                            </p>
                          </div>
                          <CopyShareLinkButton value={latestLinkUrl} />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No share link created yet for this file.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/50 flex items-center gap-2">
              <ShieldCheck size={20} className="text-emerald-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Recent Links</h2>
            </div>
            <div className="divide-y dark:divide-zinc-800">
              {secretLinks.length === 0 ? (
                <p className="p-8 text-sm text-muted-foreground text-center">No share links yet.</p>
              ) : secretLinks.map((link) => {
                const linkUrl = `${baseUrl}/s/${link.slug}`;
                const state = getLinkState(link);

                return (
                  <div key={link.id} className="p-5 flex flex-col gap-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{link.title || link.file?.filename || "Untitled link"}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {state} • {link.viewCount}{link.viewLimit ? ` / ${link.viewLimit}` : ""} downloads • expires {formatDateTime(link.expiresAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link href={`/s/${link.slug}`} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
                          <Link2 size={16} />
                          Open
                        </Link>
                        <CopyShareLinkButton value={linkUrl} />
                        {canWriteSharing && !link.revokedAt ? (
                          <form action={revokeShareLink}>
                            <input type="hidden" name="linkId" value={link.id} />
                            <ConfirmSubmitButton
                              confirmMessage={`Revoke the link for ${link.title || link.file?.filename || "this file"}? Anyone using it will lose access immediately.`}
                              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900/30 dark:text-red-300 dark:hover:bg-red-900/20"
                            >
                              <ShieldX size={16} />
                              Revoke
                            </ConfirmSubmitButton>
                          </form>
                        ) : null}
                      </div>
                    </div>
                    <p className="break-all text-xs text-muted-foreground">{linkUrl}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
