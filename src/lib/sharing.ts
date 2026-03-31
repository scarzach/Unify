import { createHash, randomBytes } from "crypto";
import path from "path";

export const uploadsRoot = path.join(process.cwd(), "uploads");

export function generateShareSlug() {
  return randomBytes(9).toString("base64url");
}

export function buildStoragePath(filename: string) {
  const extension = path.extname(filename);
  const key = `${Date.now()}-${randomBytes(8).toString("hex")}${extension}`;
  return {
    key,
    relativePath: path.join("sharing", key),
  };
}

export function getAbsoluteUploadPath(relativePath: string) {
  return path.join(uploadsRoot, relativePath);
}

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let size = sizeBytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatRelativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    const minutes = Math.max(1, Math.round(diffMs / minute));
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  if (diffMs < day) {
    const hours = Math.round(diffMs / hour);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.round(diffMs / day);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function formatDateTime(date: Date | null) {
  if (!date) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
