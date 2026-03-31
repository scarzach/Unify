import { prisma } from "@/lib/prisma";
import { getAbsoluteUploadPath, hashPassword } from "@/lib/sharing";
import { readFile } from "fs/promises";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

function isLinkAccessible(link: {
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

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const url = new URL(request.url);
  const suppliedPassword = url.searchParams.get("password");

  const link = await prisma.secretLink.findUnique({
    where: { slug },
    include: {
      file: true,
    },
  });

  if (!link || !link.file || !isLinkAccessible(link)) {
    return NextResponse.json({ error: "Share link is not available" }, { status: 404 });
  }

  if (link.passwordHash && hashPassword(suppliedPassword ?? "") !== link.passwordHash) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const claimedAt = new Date();
  const nextViewCount = link.viewCount + 1;
  const shouldBurn = Boolean(link.viewLimit && nextViewCount >= link.viewLimit);
  const claimResult = await prisma.secretLink.updateMany({
    where: {
      id: link.id,
      revokedAt: null,
      isBurned: false,
      AND: [
        { viewCount: link.viewCount },
        ...(link.viewLimit ? [{ viewCount: { lt: link.viewLimit } }] : []),
      ],
      ...(link.expiresAt ? { expiresAt: { gt: claimedAt } } : {}),
    },
    data: {
      viewCount: nextViewCount,
      lastAccessedAt: claimedAt,
      isBurned: shouldBurn,
    },
  });

  if (claimResult.count === 0) {
    return NextResponse.json({ error: "Share link is not available" }, { status: 409 });
  }

  const fileBuffer = await readFile(getAbsoluteUploadPath(link.file.path));

  await prisma.fileActivity.create({
    data: {
      workspaceId: link.workspaceId,
      userId: link.ownerId,
      fileId: link.fileId,
      secretLinkId: link.id,
      type: "LINK_ACCESSED",
      message: `${link.file.filename} was accessed through a share link`,
    },
  });

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": link.file.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(link.file.filename)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
