import { prisma } from "@/lib/prisma";
import { formatBytes, formatDateTime, hashPassword } from "@/lib/sharing";
import Link from "next/link";
import { Download, FileLock2, ShieldAlert } from "lucide-react";
import { notFound } from "next/navigation";

type SharePageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    password?: string;
  }>;
};

function getStatus(link: {
  revokedAt: Date | null;
  isBurned: boolean;
  expiresAt: Date | null;
  viewLimit: number | null;
  viewCount: number;
}) {
  if (link.revokedAt) {
    return "This share link has been revoked.";
  }

  if (link.isBurned) {
    return "This share link has already been consumed.";
  }

  if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) {
    return "This share link has expired.";
  }

  if (link.viewLimit && link.viewCount >= link.viewLimit) {
    return "This share link has reached its view limit.";
  }

  return null;
}

export default async function SharePage({ params, searchParams }: SharePageProps) {
  const { slug } = await params;
  const { password } = await searchParams;

  const link = await prisma.secretLink.findUnique({
    where: { slug },
    include: {
      file: true,
      owner: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!link || !link.file) {
    notFound();
  }

  const statusMessage = getStatus(link);
  const requiresPassword = Boolean(link.passwordHash);
  const isPasswordValid =
    !requiresPassword || hashPassword(password ?? "") === link.passwordHash;
  const downloadUrl = `/api/sharing/links/${link.slug}${password ? `?password=${encodeURIComponent(password)}` : ""}`;

  return (
    <main className="min-h-screen bg-stone-950 px-4 py-8 text-stone-50 md:px-8">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur md:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-100">
          <FileLock2 className="h-3.5 w-3.5" />
          Secure Share
        </div>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight">{link.title ?? link.file.filename}</h1>
        <p className="mt-3 text-sm text-stone-300">
          Shared by {link.owner.name || link.owner.email || "Unify user"}.
        </p>

        <div className="mt-8 grid gap-4 rounded-[28px] border border-white/10 bg-black/20 p-5 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">File</p>
            <p className="mt-2 text-sm text-white">{link.file.filename}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Size</p>
            <p className="mt-2 text-sm text-white">{formatBytes(link.file.sizeBytes)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Expires</p>
            <p className="mt-2 text-sm text-white">{formatDateTime(link.expiresAt)}</p>
          </div>
        </div>

        {link.note ? (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-stone-200">
            {link.note}
          </div>
        ) : null}

        {statusMessage ? (
          <div className="mt-6 flex gap-3 rounded-3xl border border-red-400/20 bg-red-500/10 p-5 text-sm text-red-100">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        ) : null}

        {!statusMessage && requiresPassword ? (
          <form method="GET" className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
            <label className="block text-sm font-medium text-white" htmlFor="password">
              Link password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              defaultValue={password}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-stone-950 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-stone-500 focus:border-orange-400"
              placeholder="Enter the password provided by the sender"
            />
            <button
              type="submit"
              className="mt-4 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-orange-400"
            >
              Unlock download
            </button>
            {password && !isPasswordValid ? (
              <p className="mt-3 text-sm text-red-200">That password does not match this share link.</p>
            ) : null}
          </form>
        ) : null}

        {!statusMessage && (!requiresPassword || isPasswordValid) ? (
          <a
            href={downloadUrl}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-emerald-300"
          >
            <Download className="h-4 w-4" />
            Download file
          </a>
        ) : null}

        <div className="mt-8 text-sm text-stone-400">
          Need your own secure workspace? <Link href="/" className="text-orange-200 hover:text-white">Open Unify</Link>
        </div>
      </div>
    </main>
  );
}
