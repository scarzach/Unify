import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeDollarSign,
  CalendarClock,
  CarFront,
  CheckCircle2,
  Clock3,
  Gauge,
  Hammer,
  PenTool,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import AddLogEntryForm from "@/components/garage/AddLogEntryForm";
import AddPartForm from "@/components/garage/AddPartForm";
import EditVehicleForm from "@/components/garage/EditVehicleForm";
import VehicleCardImage from "@/components/garage/VehicleCardImage";
import {
  formatCurrency,
  formatDate,
  formatRelativeDays,
  getVehicleCatalogInfo,
  getVehicleDisplayName,
  getVehicleInsights,
  getVehicleSubtitle,
} from "@/lib/garage";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceMembershipOrRedirect, hasWorkspacePermission } from "@/lib/workspaces";

type VehiclePageProps = {
  params: Promise<{
    vehicleId: string;
  }>;
};

const statusToneClasses = {
  blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200",
  green:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200",
  amber:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
  red: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200",
};

const partToneClasses = {
  INSTALLED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200",
  WISHLIST:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200",
  REPLACED:
    "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
};

const logTypeMeta = {
  MAINTENANCE: {
    label: "Maintenance",
    icon: Wrench,
    classes:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200",
  },
  REPAIR: {
    label: "Repair",
    icon: Hammer,
    classes:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200",
  },
  MOD: {
    label: "Modification",
    icon: PenTool,
    classes:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200",
  },
};

export default async function VehicleDetailPage({ params }: VehiclePageProps) {
  const { workspace, membership } = await getCurrentWorkspaceMembershipOrRedirect();
  const { vehicleId } = await params;
  const canEditGarage = hasWorkspacePermission(membership.role, "garage:write");

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: vehicleId,
      workspaceId: workspace.id,
    },
    include: {
      logs: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      },
      parts: {
        orderBy: [{ createdAt: "desc" }],
      },
    },
  });

  if (!vehicle) {
    notFound();
  }

  const catalogInfo = getVehicleCatalogInfo(vehicle.make, vehicle.model);
  const displayName = getVehicleDisplayName(vehicle);
  const subtitle = getVehicleSubtitle(vehicle);
  const insights = getVehicleInsights(vehicle);

  const statCards = [
    {
      label: "Total spent",
      value: formatCurrency(insights.totalSpend),
      detail: vehicle.logs.length > 0 ? `${vehicle.logs.length} entries tracked` : "No spend tracked yet",
      icon: BadgeDollarSign,
      accent: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
    },
    {
      label: "Last maintenance",
      value: insights.lastMaintenance ? formatRelativeDays(insights.lastMaintenance.date) : "Not logged",
      detail: insights.lastMaintenance ? formatDate(insights.lastMaintenance.date) : "Add your first service record",
      icon: ShieldCheck,
      accent: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-500/10",
    },
    {
      label: "Installed parts",
      value: insights.installedParts.toString(),
      detail: insights.wishlistParts > 0 ? `${insights.wishlistParts} on wishlist` : "No wishlist items",
      icon: Sparkles,
      accent: "text-violet-600",
      bg: "bg-violet-50 dark:bg-violet-500/10",
    },
    {
      label: "Repairs on file",
      value: insights.repairCount.toString(),
      detail: insights.modCount > 0 ? `${insights.modCount} mods recorded` : "No mods recorded yet",
      icon: Clock3,
      accent: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-500/10",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/garage"
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to garage
        </Link>
        {canEditGarage ? <EditVehicleForm vehicle={vehicle} /> : null}
        <span className="text-sm text-muted-foreground">Vehicle detail</span>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative min-h-[320px] border-b border-gray-200 bg-slate-950 lg:border-b-0 lg:border-r dark:border-zinc-800">
            {vehicle.photoUrl ? (
              <>
                <img
                  src={vehicle.photoUrl}
                  alt={displayName}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-slate-950/30" />
              </>
            ) : (
              <VehicleCardImage make={vehicle.make} model={vehicle.model} year={vehicle.year} />
            )}

            <div className="relative flex h-full flex-col justify-between gap-8 p-8 text-white">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${statusToneClasses[insights.status.tone]}`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {insights.status.label}
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                  {vehicle.make}
                </span>
              </div>

              <div className="max-w-2xl">
                <p className="text-sm uppercase tracking-[0.3em] text-white/60">Digital garage vehicle</p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{displayName}</h1>
                <p className="mt-3 text-base text-white/70">{subtitle}</p>
                <p className="mt-6 max-w-xl text-sm leading-6 text-white/75">
                  {insights.status.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {vehicle.trim ? (
                  <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">Trim</p>
                    <p className="mt-1 text-sm font-semibold">{vehicle.trim}</p>
                  </div>
                ) : null}
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">Activity</p>
                  <p className="mt-1 text-sm font-semibold">
                    {insights.latestLog ? formatRelativeDays(insights.latestLog.date) : "No records yet"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">Catalog image</p>
                  <p className="mt-1 text-sm font-semibold">
                    {vehicle.photoUrl ? "Custom photo" : catalogInfo ? "Using fallback" : "Abstract fallback"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-6 p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-500">Vehicle profile</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <ProfileField label="Nickname" value={vehicle.nickname || "Not set"} />
                <ProfileField label="VIN" value={vehicle.vin || "Not added"} mono />
                <ProfileField label="Maintenance logs" value={insights.maintenanceCount.toString()} />
                <ProfileField label="Wishlist parts" value={insights.wishlistParts.toString()} />
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white p-3 text-blue-600 shadow-sm dark:bg-zinc-900">
                  <CarFront className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Recommended next move</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {insights.lastMaintenance
                      ? "Log the next service before the history goes stale, and keep parts tied to the work that changed the car."
                      : "Start with a baseline maintenance entry so this page becomes a real service record instead of just a vehicle card."}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Catalog coverage</p>
                  <p className="mt-1 text-sm font-medium">
                    {catalogInfo ? `${catalogInfo.trims.length} known trims` : "Custom configuration"}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Last timeline event</p>
                  <p className="mt-1 text-sm font-medium">
                    {insights.latestLog ? formatDate(insights.latestLog.date) : "Nothing logged yet"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight">{card.value}</p>
                <p className="mt-2 text-sm text-muted-foreground">{card.detail}</p>
              </div>
              <div className={`${card.bg} ${card.accent} rounded-2xl p-3`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.4fr_0.9fr]">
        <section className="space-y-8">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-500">Timeline</p>
                <h2 className="mt-2 text-2xl font-semibold">Work history</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Repairs, services, and modifications in the order they happened.
                </p>
              </div>
              <div className="rounded-2xl bg-gray-100 px-4 py-2 text-sm font-medium dark:bg-zinc-800">
                {vehicle.logs.length} total
              </div>
            </div>

            {vehicle.logs.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center dark:border-zinc-700 dark:bg-zinc-950/60">
                <CalendarClock className="mx-auto h-10 w-10 text-gray-400" />
                <h3 className="mt-4 text-lg font-semibold">No history yet</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  The vehicle page is ready for a real maintenance timeline. Start with the first service or mod entry and this becomes the single source of truth for the car.
                </p>
              </div>
            ) : (
              <div className="mt-8 space-y-5">
                {vehicle.logs.map((log) => {
                  const meta = logTypeMeta[log.type];

                  return (
                    <article
                      key={log.id}
                      className="rounded-3xl border border-gray-200 bg-gray-50/70 p-5 dark:border-zinc-800 dark:bg-zinc-950/60"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-4">
                          <div className={`h-fit rounded-2xl border p-3 ${meta.classes}`}>
                            <meta.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${meta.classes}`}>
                                {meta.label}
                              </span>
                              <span className="text-sm text-muted-foreground">{formatDate(log.date)}</span>
                            </div>
                            <h3 className="mt-3 text-lg font-semibold">{log.title}</h3>
                            {log.description ? (
                              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                                {log.description}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="grid gap-3 sm:min-w-40">
                          <TimelineStat
                            icon={Gauge}
                            label="Odometer"
                            value={log.odometer ? `${log.odometer.toLocaleString()} mi` : "Not set"}
                          />
                          <TimelineStat
                            icon={BadgeDollarSign}
                            label="Cost"
                            value={log.cost ? formatCurrency(log.cost.toNumber()) : "Not tracked"}
                          />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-500">Parts</p>
                <h2 className="mt-2 text-2xl font-semibold">Inventory and wishlist</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Everything installed, waiting to install, or already cycled out.
                </p>
              </div>
              <div className="rounded-2xl bg-gray-100 px-4 py-2 text-sm font-medium dark:bg-zinc-800">
                {vehicle.parts.length} tracked
              </div>
            </div>

            {vehicle.parts.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center dark:border-zinc-700 dark:bg-zinc-950/60">
                <Sparkles className="mx-auto h-10 w-10 text-gray-400" />
                <h3 className="mt-4 text-lg font-semibold">No parts tracked yet</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Add consumables, installed hardware, or a future wishlist so this page also covers what lives on the car.
                </p>
              </div>
            ) : (
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {vehicle.parts.map((part) => (
                  <article
                    key={part.id}
                    className="rounded-3xl border border-gray-200 bg-gray-50/70 p-5 dark:border-zinc-800 dark:bg-zinc-950/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">{part.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {part.partNumber || "No part number recorded"}
                        </p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${partToneClasses[part.status]}`}>
                        {part.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-4 text-xs uppercase tracking-[0.22em] text-gray-500">
                      Added {formatDate(part.createdAt)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          {canEditGarage ? <AddLogEntryForm vehicleId={vehicle.id} /> : null}
          {canEditGarage ? <AddPartForm vehicleId={vehicle.id} /> : null}
        </aside>
      </div>
    </div>
  );
}

function ProfileField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/70">
      <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">{label}</p>
      <p className={`mt-2 text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function TimelineStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 text-gray-500">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] uppercase tracking-[0.22em]">{label}</span>
      </div>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}
