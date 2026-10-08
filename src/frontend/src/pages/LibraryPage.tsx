import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeletePlan, useListPlans } from "@/hooks/useQueries";
import {
  ASPECT_RATIO_HINTS,
  ASPECT_RATIO_LABELS,
  formatDuration,
  formatTimestamp,
} from "@/types";
import type { ClipPlan } from "@/types";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Captions,
  Clapperboard,
  Clock,
  Film,
  Library,
  Plus,
  Ratio,
  Trash2,
} from "lucide-react";
import { useState } from "react";

const SKELETON_IDS = Array.from({ length: 4 }, (_, i) => `plan-skeleton-${i}`);

function PlanCard({
  plan,
  position,
  onDelete,
  deleting,
}: {
  plan: ClipPlan;
  position: number;
  onDelete: (plan: ClipPlan) => void;
  deleting: boolean;
}) {
  return (
    <article
      data-ocid={`library.plan.${position}`}
      className="gradient-border animate-fade-up group flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-panel transition-smooth hover:shadow-elevated"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="gradient-primary flex size-10 shrink-0 items-center justify-center rounded-xl shadow-elevated">
            <Film className="size-5 text-primary-foreground" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-semibold leading-tight text-foreground">
              {plan.name}
            </h2>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {plan.sourceTitle}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          data-ocid={`library.delete_button.${position}`}
          onClick={() => onDelete(plan)}
          disabled={deleting}
          aria-label={`Hapus rencana ${plan.name}`}
          className="shrink-0 rounded-full text-muted-foreground transition-smooth hover:bg-destructive/15 hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-background/50 px-3 py-2">
          <dt className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <Clock className="size-3" aria-hidden />
            Durasi
          </dt>
          <dd className="mt-1 font-medium text-foreground">
            {formatDuration(Number(plan.maxClipSeconds))}
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-background/50 px-3 py-2">
          <dt className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <Ratio className="size-3" aria-hidden />
            Rasio
          </dt>
          <dd className="mt-1 font-medium text-foreground">
            {ASPECT_RATIO_LABELS[plan.aspectRatio]}
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-background/50 px-3 py-2">
          <dt className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <Captions className="size-3" aria-hidden />
            Subtitle
          </dt>
          <dd className="mt-1 font-medium text-foreground">
            {plan.subtitlesEnabled ? "Aktif" : "Nonaktif"}
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-background/50 px-3 py-2">
          <dt className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <Clapperboard className="size-3" aria-hidden />
            Klip
          </dt>
          <dd className="mt-1 font-medium text-foreground">
            {plan.clips.length}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {formatTimestamp(plan.createdAt)} ·{" "}
          {ASPECT_RATIO_HINTS[plan.aspectRatio]}
        </p>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="rounded-full border-border bg-secondary/40 transition-smooth hover:border-primary/50 hover:text-foreground"
        >
          <Link
            to="/plans/$planId"
            params={{ planId: plan.id.toString() }}
            data-ocid={`library.open_button.${position}`}
          >
            Buka rencana
            <ArrowRight
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </Button>
      </div>
    </article>
  );
}

export default function LibraryPage() {
  const { data: plans, isLoading, isError, refetch } = useListPlans();
  const deletePlan = useDeletePlan();
  const [pendingDelete, setPendingDelete] = useState<ClipPlan | null>(null);

  const sorted = plans
    ? [...plans].sort((a, b) => Number(b.createdAt - a.createdAt))
    : [];

  function handleConfirmDelete() {
    if (!pendingDelete) return;
    deletePlan.mutate(pendingDelete.id, {
      onSuccess: () => setPendingDelete(null),
    });
  }

  return (
    <section
      data-ocid="library.page"
      className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 md:py-16"
    >
      <header className="animate-fade-up flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl border border-border bg-card shadow-panel">
            <Library className="size-6 text-primary" aria-hidden />
          </span>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Pustaka <span className="gradient-text">Klip</span>
            </h1>
            <p className="mt-2 max-w-xl text-balance text-muted-foreground">
              Semua rencana klip yang pernah kamu buat tersimpan di sini.
            </p>
          </div>
        </div>
        <Button
          asChild
          className="gradient-primary rounded-full text-primary-foreground shadow-elevated transition-smooth hover:opacity-90"
        >
          <Link to="/" data-ocid="library.new_plan_button">
            <Plus className="size-4" aria-hidden />
            Rencana baru
          </Link>
        </Button>
      </header>

      <div className="mt-10">
        {isLoading ? (
          <div
            data-ocid="library.loading_state"
            className="grid gap-4 md:grid-cols-2"
          >
            {SKELETON_IDS.map((id) => (
              <div
                key={id}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-8 w-32 rounded-full" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div
            data-ocid="library.error_state"
            className="flex flex-col items-center gap-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-6 py-14 text-center"
          >
            <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/20">
              <AlertTriangle className="size-6 text-destructive" aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Gagal memuat pustaka
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Terjadi masalah saat mengambil rencana tersimpan.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              data-ocid="library.retry_button"
              onClick={() => void refetch()}
              className="rounded-full border-border transition-smooth hover:border-primary/50"
            >
              Coba lagi
            </Button>
          </div>
        ) : sorted.length === 0 ? (
          <div
            data-ocid="library.empty_state"
            className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center"
          >
            <span className="gradient-primary flex size-14 items-center justify-center rounded-2xl shadow-elevated">
              <Clapperboard
                className="size-7 text-primary-foreground"
                aria-hidden
              />
            </span>
            <div className="max-w-md">
              <h2 className="font-display text-xl font-semibold text-foreground">
                Belum ada rencana klip
              </h2>
              <p className="mt-2 text-balance text-sm text-muted-foreground">
                Tempel link YouTube pertamamu dan biarkan AI memilih momen
                terbaik untuk dijadikan klip pendek.
              </p>
            </div>
            <Button
              asChild
              className="gradient-primary rounded-full text-primary-foreground shadow-elevated transition-smooth hover:opacity-90"
            >
              <Link to="/" data-ocid="library.empty_cta_button">
                <Plus className="size-4" aria-hidden />
                Buat rencana pertamamu
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sorted.map((plan, index) => (
              <PlanCard
                key={plan.id.toString()}
                plan={plan}
                position={index + 1}
                onDelete={setPendingDelete}
                deleting={deletePlan.isPending && pendingDelete?.id === plan.id}
              />
            ))}
          </div>
        )}
      </div>

      {pendingDelete ? (
        <div
          data-ocid="library.delete_modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-plan-title"
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
                  id="delete-plan-title"
                  className="font-display text-lg font-semibold text-foreground"
                >
                  Hapus rencana ini?
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {pendingDelete.name}
                  </span>{" "}
                  akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
                </p>
              </div>
            </div>
            {deletePlan.isError ? (
              <p
                data-ocid="library.delete_error"
                className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                Gagal menghapus rencana. Coba lagi.
              </p>
            ) : null}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                data-ocid="library.cancel_button"
                onClick={() => setPendingDelete(null)}
                disabled={deletePlan.isPending}
                className="rounded-full border-border transition-smooth hover:border-primary/50"
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="destructive"
                data-ocid="library.confirm_button"
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
