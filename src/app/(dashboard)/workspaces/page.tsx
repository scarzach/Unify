import CopyShareLinkButton from "@/components/dashboard/CopyShareLinkButton";
import ConfirmSubmitButton from "@/components/dashboard/ConfirmSubmitButton";
import {
  createWorkspace,
  refreshWorkspaceInvite,
  inviteWorkspaceMember,
  removeWorkspaceMember,
  revokeWorkspaceInvite,
  updateWorkspaceMemberRole,
} from "@/lib/actions/workspaces";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceMembershipOrRedirect, hasWorkspacePermission } from "@/lib/workspaces";
import { formatDateTime } from "@/lib/sharing";
import { headers } from "next/headers";
import { Building2, Mail, PlusCircle, Users } from "lucide-react";

type WorkspacesPageProps = {
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
  if (error) {
    return { tone: "error", text: decodeURIComponent(error) };
  }

  if (status === "workspace-created") {
    return { tone: "success", text: "Workspace created and set as active." };
  }

  if (status === "workspace-switched") {
    return { tone: "success", text: "Active workspace updated." };
  }

  if (status === "invite-created") {
    return { tone: "success", text: "Invite created. Share the join link with that person." };
  }

  if (status === "invite-refreshed") {
    return { tone: "success", text: "Invite link refreshed and extended for another 7 days." };
  }

  if (status === "invite-revoked") {
    return { tone: "success", text: "Invite revoked." };
  }

  if (status === "invite-accepted") {
    return { tone: "success", text: "Invite accepted. This workspace is now linked to your account." };
  }

  if (status === "member-updated") {
    return { tone: "success", text: "Member role updated." };
  }

  if (status === "member-removed") {
    return { tone: "success", text: "Member removed from the workspace." };
  }

  return null;
}

export default async function WorkspacesPage({ searchParams }: WorkspacesPageProps) {
  const { workspace, membership, memberships } = await getCurrentWorkspaceMembershipOrRedirect();
  const params = await searchParams;
  const flashMessage = getFlashMessage(params.status, params.error);
  const headerList = await headers();
  const baseUrl = getBaseUrl(headerList.get("host"));
  const canInviteMembers = hasWorkspacePermission(membership.role, "members:invite");
  const canChangeRoles = hasWorkspacePermission(membership.role, "members:change_role");
  const canRemoveMembers = hasWorkspacePermission(membership.role, "members:remove");

  const [members, pendingInvites] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    prisma.workspaceInvite.findMany({
      where: {
        workspaceId: workspace.id,
        acceptedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 text-stone-50 shadow-2xl shadow-black/20">
        <p className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
          <Users className="h-3.5 w-3.5" />
          Workspace Linking
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">{workspace.name}</h1>
        <p className="mt-3 max-w-3xl text-sm text-stone-300 md:text-base">
          Link accounts by placing them in the same workspace. Members in this workspace share access to
          Garage, Sharing, and Finance based on their role.
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

      <section className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-8">
          <div className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-blue-500" />
              <h2 className="text-xl font-bold">Create a shared workspace</h2>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Keep your personal workspace for solo data, then create a household or team workspace to link
              accounts and collaborate.
            </p>
            <form action={createWorkspace} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="name">
                  Workspace name
                </label>
                <input
                  id="name"
                  name="name"
                  placeholder="Smith household, Apartment 3B, Garage team"
                  className="w-full rounded-lg border bg-gray-50 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <button className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                Create workspace
              </button>
            </form>
          </div>

          <div className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold">Your workspaces</h2>
            </div>
            <div className="mt-5 space-y-3">
              {memberships.map((item) => (
                <div
                  key={item.workspaceId}
                  className={`rounded-2xl border p-4 ${
                    item.workspaceId === workspace.id
                      ? "border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-900/20"
                      : "border-gray-200 bg-gray-50 dark:border-zinc-800 dark:bg-zinc-800/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.workspace.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.role} {item.workspace.isPersonal ? "• Personal workspace" : "• Shared workspace"}
                      </p>
                    </div>
                    {item.workspaceId === workspace.id ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:bg-zinc-950 dark:text-zinc-300">
                        Active
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-emerald-500" />
              <h2 className="text-xl font-bold">Invite a member</h2>
            </div>
            {canInviteMembers ? (
              <>
                <p className="mt-3 text-sm text-muted-foreground">
                  Invite someone by email. They can accept the invite after logging in with the same address.
                </p>
                <form action={inviteWorkspaceMember} className="mt-6 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium" htmlFor="email">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      className="w-full rounded-lg border bg-gray-50 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium" htmlFor="role">
                      Role
                    </label>
                    <select
                      id="role"
                      name="role"
                      defaultValue="MEMBER"
                      className="w-full rounded-lg border bg-gray-50 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Member</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  </div>
                  <button className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700">
                    Create invite
                  </button>
                </form>
              </>
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-muted-foreground dark:border-zinc-800 dark:bg-zinc-800/50">
                Your current role cannot invite members to this workspace.
              </p>
            )}
          </div>

          <div className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <h2 className="text-xl font-bold">Members</h2>
            </div>
            <div className="mt-5 space-y-3">
              {members.map((item) => (
                <div key={item.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.user.name || item.user.email}</p>
                      <p className="text-sm text-muted-foreground">{item.user.email}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:bg-zinc-950 dark:text-zinc-300">
                      {item.role}
                    </span>
                  </div>
                  {item.role !== "OWNER" && (canChangeRoles || canRemoveMembers) ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {canChangeRoles ? (
                        <form action={updateWorkspaceMemberRole} className="flex flex-wrap gap-2">
                          <input type="hidden" name="memberId" value={item.id} />
                          <select
                            name="role"
                            defaultValue={item.role}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="MEMBER">Member</option>
                            <option value="VIEWER">Viewer</option>
                          </select>
                          <button className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800">
                            Save role
                          </button>
                        </form>
                      ) : null}
                      {canRemoveMembers ? (
                        <form action={removeWorkspaceMember}>
                          <input type="hidden" name="memberId" value={item.id} />
                          <ConfirmSubmitButton
                            confirmMessage={`Remove ${item.user.name || item.user.email} from this workspace?`}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900/30 dark:text-red-300 dark:hover:bg-red-900/20"
                          >
                            Remove
                          </ConfirmSubmitButton>
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-xl font-bold">Pending invites</h2>
            {pendingInvites.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-muted-foreground dark:border-zinc-800 dark:bg-zinc-800/50">
                No pending invites for this workspace.
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                {pendingInvites.map((invite) => {
                  const joinUrl = `${baseUrl}/join/${invite.token}`;

                  return (
                    <div key={invite.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{invite.email}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {invite.role} • Expires {formatDateTime(invite.expiresAt)}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:bg-zinc-950 dark:text-zinc-300">
                          Pending
                        </span>
                      </div>
                      <p className="mt-3 break-all rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-muted-foreground dark:border-zinc-700 dark:bg-zinc-950">
                        {joinUrl}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <CopyShareLinkButton value={joinUrl} />
                        <form action={refreshWorkspaceInvite}>
                          <input type="hidden" name="inviteId" value={invite.id} />
                          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-800">
                            Refresh link
                          </button>
                        </form>
                        <form action={revokeWorkspaceInvite}>
                          <input type="hidden" name="inviteId" value={invite.id} />
                          <ConfirmSubmitButton
                            confirmMessage={`Revoke the invite for ${invite.email}? The current join link will stop working.`}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900/30 dark:text-red-300 dark:hover:bg-red-900/20"
                          >
                            Revoke
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
