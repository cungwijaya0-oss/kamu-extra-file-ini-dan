import { ClipCard } from "@/components/ClipCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeletePlan, useGetPlan } from "@/hooks/useQueries";
import {
  ASPECT_RATIO_HINTS,
  ASPECT_RATIO_LABELS,
  formatDuration,
  formatTimestamp,
} from "@/types";
import type { ClipPlan } from "@/types";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Captions,
  Check,
  Clock,
  Download,
  Film,
  Languages,
  Ratio,
  Trash2,
  Tv,
} from "lucide-react";
import { useState } from "react";

const SKELETON_IDS = Array.from({ length: 3 }, (_, i) => `clip-skeleton-${i}`);

/** Build a plain-text export of the full plan. */
function buildPlanText(plan: ClipPlan): string {
  const lines: string[] = [
    `KLIPPER AI PRO — ${plan.name}`,
    `Dibuat: ${formatTimestamp(plan.createdAt)}`,
    "",
    `Video sumber : ${plan.sourceTitle}`,
    `Channel      : ${plan.channel}`,
    `Link         : ${plan.sourceUrl}`,
    `Durasi video : ${formatDuration(Number(plan.durationSeconds))}`,
    `Bahasa       : ${plan.language}`,
    `Durasi klip  : ${formatDuration(Number(plan.maxClipSeconds))}`,
    `Rasio        : ${ASPECT_RATIO_LABELS[plan.aspectRatio]} (${ASPECT_RATIO_HINTS[plan.aspectRatio]})`,
    `Subtitle     : ${plan.subtitlesEnabled ? "Aktif" : "Nonaktif"}`,
    `Jumlah klip  : ${plan.clips.length}`,
    "",
    "=".repeat(48),
    "",
  ];

  plan.clips.forEach((clip, index) => {
    lines.push(
      `KLIP ${String(index + 1).padStart(2, "0")}`,
      `Waktu   : ${formatDuration(Number(clip.startSeconds))} – ${formatDuration(Number(clip.endSeconds))}`,
      `Judul   : ${clip.title}`,
      `Caption : ${clip.caption}`,
      `Hashtag : ${clip.hashtags.join(" ")}`,
      "",
    );
  });

  return lines.join("\n");
}

function downloadPlan(plan: ClipPlan) {
  const blob = new Blob([buildPlanText(plan)], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const safeName = plan.name.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "");
  anchor.href = url;
  anchor.download = `${safeName || "rencana-klip"}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Film;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/50 px-3 py-2.5">
      <dt className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm font-medium text-foreground">
        {value}
      </dd>
    </div>
  );
}

export default function PlanDetailPage() {
  const { planId } = useParams({ from: "/plans/$planId" });
  const id = /^\d+$/.test(planId) ? BigInt(planId) : undefined;
  const { data: plan, isLoading, isError, refetch } = useGetPlan(id);
  const deletePlan = useDeletePlan();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  function handleDownload() {
    if (!plan) return;
    downloadPlan(plan);
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 2000);
  }

  function handleConfirmDelete() {
    if (!plan) return;
    deletePlan.mutate(plan.id, {
      onSuccess: () => {
        void navigate({ to: "/library" });
      },
    });
  }

  return (
    <section
      data-ocid="plan_detail.page"
      className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 md:py-16"
    >
      <Link
        to="/library"
        data-ocid="plan_detail.back_link"
        className="mb-8 inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-sm font-medium text-muted-foreground transition-smooth hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke Pustaka
      </Link>

      {isLoading ? (
        <div data-ocid="plan_detail.loading_state" className="space-y-6">
          <Skeleton className="h-10 w-2/3 max-w-md" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <div className="grid gap-4 md:grid-cols-2">
            {SKELETON_IDS.map((skeletonId) => (
              <Skeleton key={skeletonId} className="h-56 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <div
          data-ocid="plan_detail.error_state"
          className="flex flex-col items-center gap-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-6 py-14 text-center"
        >
          <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/20">
            <AlertTriangle className="size-6 text-destructive" aria-hidden />
          </span>
          <div>
            <h1 className="font-display text-lg font-semibold text-foreground">
              Gagal memuat rencana
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Terjadi masalah saat mengambil detail rencana ini.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            data-ocid="plan_detail.retry_button"
            onClick={() => void refetch()}
            className="rounded-full border-border transition-smooth hover:border-primary/50"
          >
            Coba lagi
          </Button>
        </div>
      ) : !plan ? (
        <div
          data-ocid="plan_detail.not_found_state"
          className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center"
        >
          <span className="flex size-14 items-center justify-center rounded-2xl border border-border bg-card shadow-panel">
            <Film className="size-7 text-muted-foreground" aria-hidden />
          </span>
          <div className="max-w-md">
            <h1 className="font-display text-xl font-semibold text-foreground">
              Rencana tidak ditemukan
            </h1>
            <p className="mt-2 text-balance text-sm text-muted-foreground">
              Rencana ini mungkin sudah dihapus atau tidak tersedia untuk akun
              ini.
            </p>
          </div>
          <Button
            asChild
            className="gradient-primary rounded-full text-primary-foreground shadow-elevated transition-smooth hover:opacity-90"
          >
            <Link to="/library" data-ocid="plan_detail.back_to_library_button">
              Kembali ke Pustaka
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          <header className="animate-fade-up flex flex-col gap-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Rencana klip · {formatTimestamp(plan.createdAt)}
                </p>
                <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
                  {plan.name}
                </h1>
                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {plan.sourceTitle}
                  </span>
                  <span aria-hidden>·</span>
                  <span>{plan.channel}</span>
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  type="button"
                  data-ocid="plan_detail.download_button"
                  onClick={handleDownload}
                  className="gradient-primary rounded-full text-primary-foreground shadow-elevated transition-smooth hover:opacity-90"
                >
                  {downloaded ? (
                    <Check className="size-4" aria-hidden />
                  ) : (
                    <Download className="size-4" aria-hidden />
                  )}
                  {downloaded ? "Terunduh" : "Unduh rencana"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  data-ocid="plan_detail.delete_button"
                  onClick={() => setConfirming(true)}
                  className="rounded-full border-border text-muted-foreground transition-smooth hover:border-destructive/50 hover:text-destructive"
                >
                  <Trash2 className="size-4" aria-hidden />
                  Hapus
                </Button>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <MetaItem icon={Tv} label="Channel" value={plan.channel} />
              <MetaItem
                icon={Clock}
                label="Durasi video"
                value={formatDuration(Number(plan.durationSeconds))}
              />
              <MetaItem icon={Languages} label="Bahasa" value={plan.language} />
              <MetaItem
                icon={Ratio}
                label="Rasio"
                value={ASPECT_RATIO_LABELS[plan.aspectRatio]}
              />
              <MetaItem
                icon={Captions}
                label="Subtitle"
                value={plan.subtitlesEnabled ? "Aktif" : "Nonaktif"}
              />
              <MetaItem
                icon={Film}
                label="Durasi klip"
                value={formatDuration(Number(plan.maxClipSeconds))}
              />
            </dl>
          </header>

          <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Klip <span className="gradient-text">({plan.clips.length})</span>
            </h2>
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {ASPECT_RATIO_HINTS[plan.aspectRatio]}
            </span>
          </div>

          {plan.clips.length === 0 ? (
            <div
              data-ocid="plan_detail.clips_empty_state"
              className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center text-sm text-muted-foreground"
            >
              Rencana ini belum memiliki klip.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {plan.clips.map((clip, index) => (
                <ClipCard
                  key={clip.index.toString()}
                  clip={clip}
                  position={index + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {confirming && plan ? (
        <div
          data-ocid="plan_detail.delete_modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-plan-detail-title"
            className="animate-fade-up w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-panel"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/15">
                <AlertTriangle
                  className="size-5 text-destructive"
                  aria-hidden
                />
              </span>
              <div>
                <h2
                  id="delete-plan-detail-title"
                  className="font-display text-lg font-semibold text-foreground"
                >
                  Hapus rencana ini?
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {plan.name}
                  </span>{" "}
                  akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
                </p>
              </div>
            </div>
            {deletePlan.isError ? (
              <p
                data-ocid="plan_detail.delete_error"
                className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                Gagal menghapus rencana. Coba lagi.
              </p>
            ) : null}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                data-ocid="plan_detail.cancel_button"
                onClick={() => setConfirming(false)}
                disabled={deletePlan.isPending}
                className="rounded-full border-border transition-smooth hover:border-primary/50"
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="destructive"
                data-ocid="plan_detail.confirm_button"
                onClick={handleConfirmDelete}
                disabled={deletePlan.isPending}
                className="rounded-full transition-smooth"
              >
                {deletePlan.isPending ? "Menghapus…" : "Hapus rencana"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
