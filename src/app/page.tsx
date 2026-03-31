import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, FolderLock, Gauge, Wallet } from "lucide-react";

const modules = [
  {
    href: "/garage",
    title: "Digital Garage",
    description: "Track vehicles, logs, maintenance, and parts in one place.",
    icon: Gauge,
    accent: "from-sky-500/20 to-cyan-400/10",
  },
  {
    href: "/sharing",
    title: "Secure Sharing",
    description: "Create expiring links for files, notes, and one-time handoffs.",
    icon: FolderLock,
    accent: "from-orange-500/20 to-amber-400/10",
  },
  {
    href: "/saas",
    title: "Mini SaaS",
    description: "Budgeting, habits, and lightweight personal operations tools.",
    icon: Wallet,
    accent: "from-emerald-500/20 to-lime-400/10",
  },
];

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-stone-950 px-4 py-8 text-stone-50 md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.18),_transparent_25%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-8 shadow-2xl shadow-black/20">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-400">
            Unify
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
            Personal operating system for the things you actually run yourself.
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-stone-300 md:text-base">
            A self-hosted platform for managing your digital garage, secure file sharing, and personal utilities.
          </p>
          <div className="mt-8 flex gap-4">
            <Link
              href="/login"
              className="rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-orange-400"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-semibold text-stone-100 transition hover:bg-white/5"
            >
              Get Started
            </Link>
          </div>
        </header>

        <section className="mt-8 grid gap-6 md:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon;

            return (
              <Link
                key={module.title}
                href={module.href}
                className={`group rounded-[28px] border border-white/10 bg-gradient-to-br ${module.accent} p-6 transition hover:-translate-y-1 hover:border-white/20 hover:shadow-xl hover:shadow-black/20`}
              >
                <div className="flex h-full flex-col">
                  <div className="mb-8 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-semibold">{module.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-stone-300">{module.description}</p>
                  <span className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-stone-100">
                    Open module
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
