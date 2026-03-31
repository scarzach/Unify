import { auth } from "@/auth";
import { acceptWorkspaceInvite } from "@/lib/actions/workspaces";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/sharing";
import { notFound } from "next/navigation";
import { CheckCircle2, Mail, Users } from "lucide-react";
import Link from "next/link";

type JoinWorkspacePageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function JoinWorkspacePage({ params }: JoinWorkspacePageProps) {
  const { token } = await params;
  const session = await auth();
  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          isPersonal: true,
        },
      },
    },
  });

  if (!invite) {
    notFound();
  }

  const isExpired = Boolean(invite.acceptedAt || invite.expiresAt.getTime() <= Date.now());
  const sessionEmail = session?.user?.email?.toLowerCase() ?? null;
  const inviteEmail = invite.email.toLowerCase();
  const emailMatches = sessionEmail ? sessionEmail === inviteEmail : false;

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-12">
      <div className="w-full overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-gray-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-8 dark:border-zinc-800">
          <p className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-700 dark:text-blue-100">
            <Users className="h-3.5 w-3.5" />
            Workspace Invite
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Join {invite.workspace.name}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This workspace links accounts so members can collaborate inside Garage, Sharing, and Finance.
          </p>
        </div>

        <div className="space-y-6 p-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Invited email</p>
              <p className="mt-2 text-sm font-medium">{invite.email}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Role on join</p>
              <p className="mt-2 text-sm font-medium">{invite.role}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Workspace type</p>
              <p className="mt-2 text-sm font-medium">{invite.workspace.isPersonal ? "Personal" : "Shared"}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Expires</p>
              <p className="mt-2 text-sm font-medium">{formatDateTime(invite.expiresAt)}</p>
            </div>
          </div>

          {isExpired ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-100">
              This invite is no longer active. Ask the workspace owner for a refreshed link.
            </div>
          ) : !session ? (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-100">
              Sign in with <span className="font-semibold">{invite.email}</span> before accepting this invite.
            </div>
          ) : !emailMatches ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-100">
              You are currently signed in as <span className="font-semibold">{session.user?.email}</span>. This invite
              was created for <span className="font-semibold">{invite.email}</span>.
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                This account can accept the invite.
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {session && emailMatches && !isExpired ? (
              <form action={acceptWorkspaceInvite}>
                <input type="hidden" name="token" value={token} />
                <button className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                  Join workspace
                </button>
              </form>
            ) : null}

            {!session ? (
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                <Mail className="mr-2 h-4 w-4" />
                Sign in to continue
              </Link>
            ) : null}

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
