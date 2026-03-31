import { WorkspaceRole } from "@prisma/client";
import { getCurrentUserOrRedirect } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type WorkspacePermission =
  | "workspace:manage"
  | "workspace:delete"
  | "members:invite"
  | "members:remove"
  | "members:change_role"
  | "garage:write"
  | "sharing:write"
  | "sharing:delete"
  | "finance:import"
  | "finance:categorize"
  | "finance:clear";

const workspaceRolePermissions: Record<WorkspaceRole, WorkspacePermission[]> = {
  OWNER: [
    "workspace:manage",
    "workspace:delete",
    "members:invite",
    "members:remove",
    "members:change_role",
    "garage:write",
    "sharing:write",
    "sharing:delete",
    "finance:import",
    "finance:categorize",
    "finance:clear",
  ],
  ADMIN: [
    "members:invite",
    "members:remove",
    "garage:write",
    "sharing:write",
    "sharing:delete",
    "finance:import",
    "finance:categorize",
  ],
  MEMBER: ["garage:write", "sharing:write", "finance:import", "finance:categorize"],
  VIEWER: [],
};

export const ACTIVE_WORKSPACE_COOKIE = "unify_active_workspace";

function buildPersonalWorkspaceName(user: { name: string | null; email: string | null }) {
  if (user.name?.trim()) {
    return `${user.name.trim()}'s Workspace`;
  }

  if (user.email?.trim()) {
    return `${user.email.trim()}'s Workspace`;
  }

  return "Personal Workspace";
}

export async function ensurePersonalWorkspaceForUser(user: {
  id: string;
  name: string | null;
  email: string | null;
}) {
  const existingWorkspace = await prisma.workspace.findUnique({
    where: { personalOwnerId: user.id },
    include: {
      members: {
        where: { userId: user.id },
      },
    },
  });

  if (existingWorkspace) {
    if (existingWorkspace.members.length === 0) {
      await prisma.workspaceMember.create({
        data: {
          workspaceId: existingWorkspace.id,
          userId: user.id,
          role: "OWNER",
        },
      });
    }

    return existingWorkspace;
  }

  return prisma.workspace.create({
    data: {
      name: buildPersonalWorkspaceName(user),
      isPersonal: true,
      personalOwnerId: user.id,
      members: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
    },
  });
}

export async function getCurrentWorkspaceMembershipOrRedirect() {
  const user = await getCurrentUserOrRedirect();
  await ensurePersonalWorkspaceForUser(user);
  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value ?? null;

  const memberships = await prisma.workspaceMember.findMany({
    where: {
      userId: user.id,
    },
    include: {
      workspace: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (memberships.length === 0) {
    redirect("/dashboard");
  }

  const membership =
    memberships.find((item) => item.workspaceId === activeWorkspaceId) ??
    memberships.find((item) => item.workspace.personalOwnerId === user.id) ??
    memberships[0];

  return {
    user,
    membership,
    workspace: membership.workspace,
    memberships,
  };
}

export async function requireWorkspacePermission(permission: WorkspacePermission) {
  const context = await getCurrentWorkspaceMembershipOrRedirect();

  if (!workspaceRolePermissions[context.membership.role].includes(permission)) {
    redirect("/dashboard");
  }

  return context;
}

export function hasWorkspacePermission(role: WorkspaceRole, permission: WorkspacePermission) {
  return workspaceRolePermissions[role].includes(permission);
}
