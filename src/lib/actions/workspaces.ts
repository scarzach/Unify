"use server";

import { WorkspaceRole } from "@prisma/client";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUserOrRedirect } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import {
  ACTIVE_WORKSPACE_COOKIE,
  getCurrentWorkspaceMembershipOrRedirect,
  hasWorkspacePermission,
  requireWorkspacePermission,
} from "@/lib/workspaces";

const CreateWorkspaceSchema = z.object({
  name: z.string().min(2, "Workspace name is required").max(80, "Workspace name is too long"),
});

const InviteSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  role: z.nativeEnum(WorkspaceRole).refine((value) => value !== WorkspaceRole.OWNER, {
    message: "Invites cannot assign the owner role.",
  }),
});

const MemberRoleSchema = z.object({
  memberId: z.string().min(1, "Member not found."),
  role: z.nativeEnum(WorkspaceRole).refine((value) => value !== WorkspaceRole.OWNER, {
    message: "Owner role cannot be assigned from this screen.",
  }),
});

function setActiveWorkspaceCookie(workspaceId: string) {
  const oneYear = 60 * 60 * 24 * 365;

  return cookies().then((cookieStore) =>
    cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: oneYear,
    }),
  );
}

export async function createWorkspace(formData: FormData) {
  const user = await getCurrentUserOrRedirect();
  const parsed = CreateWorkspaceSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    redirect(`/workspaces?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid workspace name.")}`);
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: parsed.data.name.trim(),
      isPersonal: false,
      members: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
    },
  });

  await setActiveWorkspaceCookie(workspace.id);

  revalidatePath("/dashboard");
  revalidatePath("/workspaces");
  redirect("/workspaces?status=workspace-created");
}

export async function setActiveWorkspace(formData: FormData) {
  const { memberships } = await getCurrentWorkspaceMembershipOrRedirect();
  const workspaceId = formData.get("workspaceId");

  if (typeof workspaceId !== "string" || !workspaceId) {
    redirect("/workspaces?error=Choose a workspace.");
  }

  const membership = memberships.find((item) => item.workspaceId === workspaceId);
  if (!membership) {
    redirect("/workspaces?error=That workspace is not available to this account.");
  }

  await setActiveWorkspaceCookie(workspaceId);
  revalidatePath("/dashboard");
  revalidatePath("/workspaces");
  redirect("/workspaces?status=workspace-switched");
}

export async function inviteWorkspaceMember(formData: FormData) {
  const { user, workspace, membership } = await requireWorkspacePermission("members:invite");
  const parsed = InviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    redirect(`/workspaces?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid invite.")}`);
  }

  if (!hasWorkspacePermission(membership.role, "members:invite")) {
    redirect("/workspaces?error=You do not have permission to invite members.");
  }

  const email = parsed.data.email.toLowerCase();
  const existingMember = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: workspace.id,
      user: {
        email,
      },
    },
  });

  if (existingMember) {
    redirect("/workspaces?error=That person is already a member of this workspace.");
  }

  const activeInvite = await prisma.workspaceInvite.findFirst({
    where: {
      workspaceId: workspace.id,
      email,
      acceptedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (activeInvite) {
    await prisma.workspaceInvite.update({
      where: { id: activeInvite.id },
      data: {
        role: parsed.data.role,
        invitedById: user.id,
        token: randomBytes(24).toString("hex"),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });
  } else {
    await prisma.workspaceInvite.create({
      data: {
        workspaceId: workspace.id,
        email,
        role: parsed.data.role,
        token: randomBytes(24).toString("hex"),
        invitedById: user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });
  }

  revalidatePath("/workspaces");
  redirect("/workspaces?status=invite-created");
}

export async function acceptWorkspaceInviteByToken(token: string) {
  const user = await getCurrentUserOrRedirect();
  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
    include: {
      workspace: true,
    },
  });

  if (!invite || invite.acceptedAt || invite.expiresAt.getTime() <= Date.now()) {
    redirect("/dashboard?error=invite-invalid");
  }

  if (!user.email || user.email.toLowerCase() !== invite.email.toLowerCase()) {
    redirect("/dashboard?error=invite-email-mismatch");
  }

  await prisma.$transaction([
    prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: invite.workspaceId,
          userId: user.id,
        },
      },
      update: {
        role: invite.role,
      },
      create: {
        workspaceId: invite.workspaceId,
        userId: user.id,
        role: invite.role,
      },
    }),
    prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: {
        acceptedAt: new Date(),
      },
    }),
  ]);

  await setActiveWorkspaceCookie(invite.workspaceId);
  revalidatePath("/dashboard");
  revalidatePath("/workspaces");
  redirect("/workspaces?status=invite-accepted");
}

export async function acceptWorkspaceInvite(formData: FormData) {
  const token = formData.get("token");

  if (typeof token !== "string" || !token) {
    redirect("/dashboard?error=invite-invalid");
  }

  await acceptWorkspaceInviteByToken(token);
}

export async function refreshWorkspaceInvite(formData: FormData) {
  const { user, workspace } = await requireWorkspacePermission("members:invite");
  const inviteId = formData.get("inviteId");

  if (typeof inviteId !== "string" || !inviteId) {
    redirect("/workspaces?error=Invite not found.");
  }

  const invite = await prisma.workspaceInvite.findFirst({
    where: {
      id: inviteId,
      workspaceId: workspace.id,
      acceptedAt: null,
    },
  });

  if (!invite) {
    redirect("/workspaces?error=Invite not found.");
  }

  await prisma.workspaceInvite.update({
    where: { id: invite.id },
    data: {
      token: randomBytes(24).toString("hex"),
      invitedById: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    },
  });

  revalidatePath("/workspaces");
  redirect("/workspaces?status=invite-refreshed");
}

export async function revokeWorkspaceInvite(formData: FormData) {
  const { workspace } = await requireWorkspacePermission("members:invite");
  const inviteId = formData.get("inviteId");

  if (typeof inviteId !== "string" || !inviteId) {
    redirect("/workspaces?error=Invite not found.");
  }

  await prisma.workspaceInvite.deleteMany({
    where: {
      id: inviteId,
      workspaceId: workspace.id,
      acceptedAt: null,
    },
  });

  revalidatePath("/workspaces");
  redirect("/workspaces?status=invite-revoked");
}

export async function updateWorkspaceMemberRole(formData: FormData) {
  const { user, workspace } = await requireWorkspacePermission("members:change_role");
  const parsed = MemberRoleSchema.safeParse({
    memberId: formData.get("memberId"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    redirect(`/workspaces?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid member update.")}`);
  }

  const member = await prisma.workspaceMember.findFirst({
    where: {
      id: parsed.data.memberId,
      workspaceId: workspace.id,
    },
  });

  if (!member) {
    redirect("/workspaces?error=Member not found.");
  }

  if (member.userId === user.id) {
    redirect("/workspaces?error=Use another owner/admin to change your own role.");
  }

  if (member.role === "OWNER") {
    redirect("/workspaces?error=Owner role changes are not supported from this screen.");
  }

  await prisma.workspaceMember.update({
    where: { id: member.id },
    data: {
      role: parsed.data.role,
    },
  });

  revalidatePath("/workspaces");
  redirect("/workspaces?status=member-updated");
}

export async function removeWorkspaceMember(formData: FormData) {
  const { user, workspace } = await requireWorkspacePermission("members:remove");
  const memberId = formData.get("memberId");

  if (typeof memberId !== "string" || !memberId) {
    redirect("/workspaces?error=Member not found.");
  }

  const member = await prisma.workspaceMember.findFirst({
    where: {
      id: memberId,
      workspaceId: workspace.id,
    },
  });

  if (!member) {
    redirect("/workspaces?error=Member not found.");
  }

  if (member.userId === user.id) {
    redirect("/workspaces?error=Use another owner/admin to remove your own access.");
  }

  if (member.role === "OWNER") {
    redirect("/workspaces?error=Owner removal is not supported from this screen.");
  }

  await prisma.workspaceMember.delete({
    where: { id: member.id },
  });

  revalidatePath("/workspaces");
  redirect("/workspaces?status=member-removed");
}
