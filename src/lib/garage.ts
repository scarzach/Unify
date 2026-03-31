import { CAR_DATA } from "@/lib/car-data";

type VehicleIdentity = {
  nickname?: string | null;
  make: string;
  model: string;
  trim?: string | null;
  year: number;
  vin?: string | null;
};

type VehicleLogLike = {
  type: "MOD" | "REPAIR" | "MAINTENANCE";
  date: Date;
  cost?: { toNumber(): number } | null;
};

type VehiclePartLike = {
  status: "INSTALLED" | "WISHLIST" | "REPLACED";
};

type VehicleInsightsInput = VehicleIdentity & {
  logs: VehicleLogLike[];
  parts: VehiclePartLike[];
};

type VehicleStatusTone = "blue" | "green" | "amber" | "red";

const dayMs = 1000 * 60 * 60 * 24;

export function getVehicleDisplayName(vehicle: VehicleIdentity) {
  return vehicle.nickname?.trim() || `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
}

export function getVehicleSubtitle(vehicle: VehicleIdentity) {
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ");
}

export function getVehicleCatalogInfo(make: string, model: string) {
  const makeData = CAR_DATA[make as keyof typeof CAR_DATA] as
    | Record<string, { trims: string[]; photoUrl: string }>
    | undefined;

  return makeData?.[model] ?? null;
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRelativeDays(date: Date) {
  const diffInDays = Math.max(0, Math.round((Date.now() - date.getTime()) / dayMs));

  if (diffInDays === 0) {
    return "Today";
  }

  if (diffInDays === 1) {
    return "1 day ago";
  }

  if (diffInDays < 30) {
    return `${diffInDays} days ago`;
  }

  const diffInMonths = Math.round(diffInDays / 30);

  if (diffInMonths === 1) {
    return "1 month ago";
  }

  return `${diffInMonths} months ago`;
}

export function getVehicleInsights(vehicle: VehicleInsightsInput) {
  const sortedLogs = [...vehicle.logs].sort((a, b) => b.date.getTime() - a.date.getTime());
  const latestLog = sortedLogs[0] ?? null;
  const lastMaintenance =
    sortedLogs.find((log) => log.type === "MAINTENANCE") ?? null;
  const recentRepair = sortedLogs.find((log) => {
    return log.type === "REPAIR" && Date.now() - log.date.getTime() <= 90 * dayMs;
  });

  const totalSpend = sortedLogs.reduce((sum, log) => sum + (log.cost?.toNumber() ?? 0), 0);
  const maintenanceCount = sortedLogs.filter((log) => log.type === "MAINTENANCE").length;
  const repairCount = sortedLogs.filter((log) => log.type === "REPAIR").length;
  const modCount = sortedLogs.filter((log) => log.type === "MOD").length;
  const installedParts = vehicle.parts.filter((part) => part.status === "INSTALLED").length;
  const wishlistParts = vehicle.parts.filter((part) => part.status === "WISHLIST").length;

  let status = {
    label: "Needs baseline",
    tone: "amber" as VehicleStatusTone,
    description: "No service history logged yet. Start with an oil change, inspection, or first mod entry.",
  };

  if (recentRepair) {
    status = {
      label: "Needs attention",
      tone: "red",
      description: "A repair was logged recently. Keep tracking follow-up work and confirm the issue is fully resolved.",
    };
  } else if (lastMaintenance && Date.now() - lastMaintenance.date.getTime() <= 180 * dayMs) {
    status = {
      label: "Freshly serviced",
      tone: "green",
      description: "Recent maintenance is on record. This vehicle has a healthy service trail and is staying current.",
    };
  } else if (latestLog) {
    status = {
      label: "Active record",
      tone: "blue",
      description: "History is being tracked, but it may be time to log the next service interval or check-in.",
    };
  }

  return {
    status,
    latestLog,
    lastMaintenance,
    totalSpend,
    maintenanceCount,
    repairCount,
    modCount,
    installedParts,
    wishlistParts,
  };
}
