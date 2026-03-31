import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAbsoluteUploadPath } from "@/lib/sharing";
import { readFile } from "fs/promises";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    fileId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await context.params;
  const file = await prisma.file.findFirst({
    where: {
      id: fileId,
      workspace: {
        members: {
          some: {
            user: {
              email,
            },
          },
        },
      },
    },
  });

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const fileBuffer = await readFile(getAbsoluteUploadPath(file.path));

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.filename)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
