"use server";

import { prisma } from "@/lib/prisma";
import {
  buildStoragePath,
  generateShareSlug,
  getAbsoluteUploadPath,
  hashPassword,
  uploadsRoot,
} from "@/lib/sharing";
import { requireWorkspacePermission } from "@/lib/workspaces";
import { mkdir, rm, writeFile } from "fs/promises";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import path from "path";

const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

function parseOptionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseOptionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildExpiryDate(hours: number | null) {
  if (!hours) {
    return null;
  }

  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export async function uploadSharedFile(formData: FormData) {
  const { user, workspace } = await requireWorkspacePermission("sharing:write");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    redirect("/sharing?error=missing-file");
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    redirect("/sharing?error=file-too-large");
  }

  const note = parseOptionalString(formData.get("note"));
  const createLink = formData.get("createLink") === "on";
  const expiryHours = parseOptionalNumber(formData.get("expiryHours"));
  const viewLimit = parseOptionalNumber(formData.get("viewLimit"));
  const password = parseOptionalString(formData.get("password"));

  const { relativePath } = buildStoragePath(file.name);
  const absolutePath = getAbsoluteUploadPath(relativePath);
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  await mkdir(uploadsRoot, { recursive: true });
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, fileBuffer);

  const createdFile = await prisma.file.create({
    data: {
      workspaceId: workspace.id,
      filename: file.name,
      path: relativePath,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      note,
      uploaderId: user.id,
    },
  });

  await prisma.fileActivity.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      fileId: createdFile.id,
      type: "FILE_UPLOADED",
      message: `Uploaded ${file.name}`,
    },
  });

  if (createLink) {
    const createdLink = await prisma.secretLink.create({
      data: {
        workspaceId: workspace.id,
        slug: generateShareSlug(),
        ownerId: user.id,
        fileId: createdFile.id,
        title: file.name,
        note,
        type: "FILE",
        passwordHash: password ? hashPassword(password) : null,
        expiresAt: buildExpiryDate(expiryHours),
        viewLimit,
      },
    });

    await prisma.fileActivity.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        fileId: createdFile.id,
        secretLinkId: createdLink.id,
        type: "LINK_CREATED",
        message: `Created a share link for ${file.name}`,
      },
    });
  }

  revalidatePath("/sharing");
  redirect("/sharing?status=uploaded");
}

export async function createShareLink(formData: FormData) {
  const { user, workspace } = await requireWorkspacePermission("sharing:write");
  const fileIdValue = formData.get("fileId");

  if (typeof fileIdValue !== "string" || !fileIdValue) {
    redirect("/sharing?error=missing-file");
  }

  const file = await prisma.file.findFirst({
    where: {
      id: fileIdValue,
      workspaceId: workspace.id,
    },
  });

  if (!file) {
    redirect("/sharing?error=file-not-found");
  }

  const link = await prisma.secretLink.create({
    data: {
      workspaceId: workspace.id,
      slug: generateShareSlug(),
      ownerId: user.id,
      fileId: file.id,
      title: file.filename,
      type: "FILE",
      expiresAt: buildExpiryDate(72),
    },
  });

  await prisma.fileActivity.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      fileId: file.id,
      secretLinkId: link.id,
      type: "LINK_CREATED",
      message: `Created a quick share link for ${file.filename}`,
    },
  });

  revalidatePath("/sharing");
  redirect(`/sharing?status=link-created#link-${link.id}`);
}

export async function revokeShareLink(formData: FormData) {
  const { user, workspace } = await requireWorkspacePermission("sharing:write");
  const linkIdValue = formData.get("linkId");

  if (typeof linkIdValue !== "string" || !linkIdValue) {
    redirect("/sharing?error=missing-link");
  }

  const link = await prisma.secretLink.findFirst({
    where: {
      id: linkIdValue,
      workspaceId: workspace.id,
    },
    include: {
      file: true,
    },
  });

  if (!link) {
    redirect("/sharing?error=link-not-found");
  }

  await prisma.secretLink.update({
    where: { id: link.id },
    data: {
      revokedAt: new Date(),
    },
  });

  await prisma.fileActivity.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      fileId: link.fileId,
      secretLinkId: link.id,
      type: "LINK_REVOKED",
      message: `Revoked the share link for ${link.file?.filename ?? "a file"}`,
    },
  });

  revalidatePath("/sharing");
  redirect("/sharing?status=link-revoked");
}

export async function deleteSharedFile(formData: FormData) {
  const { workspace } = await requireWorkspacePermission("sharing:delete");
  const fileIdValue = formData.get("fileId");

  if (typeof fileIdValue !== "string" || !fileIdValue) {
    redirect("/sharing?error=missing-file");
  }

  const file = await prisma.file.findFirst({
    where: {
      id: fileIdValue,
      workspaceId: workspace.id,
    },
    include: {
      secretLinks: {
        select: { id: true },
      },
    },
  });

  if (!file) {
    redirect("/sharing?error=file-not-found");
  }

  const secretLinkIds = file.secretLinks.map((link) => link.id);

  await prisma.$transaction([
    prisma.fileActivity.deleteMany({
      where: secretLinkIds.length > 0
        ? {
            OR: [{ fileId: file.id }, { secretLinkId: { in: secretLinkIds } }],
          }
        : { fileId: file.id },
    }),
    prisma.attachment.deleteMany({
      where: { fileId: file.id },
    }),
    prisma.secretLink.deleteMany({
      where: { fileId: file.id },
    }),
    prisma.file.delete({
      where: { id: file.id },
    }),
  ]);

  await rm(getAbsoluteUploadPath(file.path), { force: true });

  revalidatePath("/sharing");
  redirect("/sharing?status=file-deleted");
}
