import { AspectRatio } from "@/backend";
import type { Clip, ClipPlan, PlanError } from "@/backend";

export { AspectRatio };
export type { Clip, ClipPlan, PlanError };

/** Human-readable Indonesian labels for the backend aspect-ratio variants. */
export const ASPECT_RATIO_LABELS: Record<AspectRatio, string> = {
  portrait: "9:16",
  square: "1:1",
  landscape: "16:9",
};

export const ASPECT_RATIO_HINTS: Record<AspectRatio, string> = {
  portrait: "TikTok / Shorts",
  square: "Instagram",
  landscape: "YouTube",
};

/** Max clip duration choices, in seconds. */
export const DURATION_OPTIONS: { seconds: number; label: string }[] = [
  { seconds: 30, label: "30s" },
  { seconds: 60, label: "60s" },
  { seconds: 90, label: "90s" },
  { seconds: 180, label: "3 menit" },
];

export const ASPECT_RATIO_OPTIONS: AspectRatio[] = [
  AspectRatio.portrait,
  AspectRatio.square,
  AspectRatio.landscape,
];

/** Convert a Motoko nanosecond timestamp into a JS Date, or null when invalid. */
export function timestampToDate(timestamp: bigint): Date | null {
  const date = new Date(Number(timestamp / 1_000_000n));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Format a nanosecond timestamp as a readable Indonesian date-time. */
export function formatTimestamp(timestamp: bigint): string {
  const date = timestampToDate(timestamp);
  if (!date) return "Waktu tidak diketahui";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Format a whole number of seconds as m:ss (or h:mm:ss past an hour). */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (value: number) => value.toString().padStart(2, "0");
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}

/** Turn a backend PlanError variant into a friendly Indonesian message. */
export function planErrorMessage(error: PlanError): string {
  switch (error.__kind__) {
    case "invalidUrl":
      return (
        error.invalidUrl || "Link YouTube tidak valid. Periksa kembali URL-nya."
      );
    case "noCaptions":
      return (
        error.noCaptions ||
        "Video ini tidak memiliki transkrip/caption yang bisa diproses."
      );
    case "unreachable":
      return (
        error.unreachable ||
        "Video tidak dapat dijangkau. Coba lagi beberapa saat."
      );
    case "aiFailure":
      return error.aiFailure || "AI gagal menganalisis video ini. Coba lagi.";
    default:
      return "Terjadi kesalahan yang tidak diketahui.";
  }
}
