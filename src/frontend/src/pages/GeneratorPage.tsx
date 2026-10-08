import { ClipForm, type ClipFormValues } from "@/components/ClipForm";
import { PIPELINE_STAGES, ProgressStages } from "@/components/ProgressStages";
import { Button } from "@/components/ui/button";
import { useGeneratePlan } from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import {
  ASPECT_RATIO_LABELS,
  type Clip,
  type ClipPlan,
  formatDuration,
  formatTimestamp,
  planErrorMessage,
} from "@/types";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Clapperboard,
  Clock,
  Hash,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "running" | "done" | "error";

const RATIO_CLASS: Record<string, string> = {
  portrait: "aspect-[9/16]",
  square: "aspect-square",
  landscape: "aspect-video",
};

function ClipCard({ clip, ratio }: { clip: Clip; ratio: string }) {
  return (
    <article
      data-ocid={`generator.clip_card.${Number(clip.index) + 1}`}
      className="animate-fade-up flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-panel transition-smooth hover:-translate-y-1 hover:border-primary/50"
    >
      <div
        className={cn(
          "gradient-subtle relative flex w-full items-center justify-center border-b border-border",
          RATIO_CLASS[ratio] ?? "aspect-[9/16]",
        )}
      >
        <span className="gradient-primary flex size-12 items-center justify-center rounded-2xl shadow-elevated">
          <Clapperboard
            className="size-6 text-primary-foreground"
            aria-hidden
          />
        </span>
        <span
          data-ocid={`generator.clip_timestamp.${Number(clip.index) + 1}`}
          className="absolute bottom-3 left-3 rounded-full border border-border bg-background/80 px-2.5 py-1 font-mono text-[11px] text-foreground backdrop-blur"
        >
          {formatDuration(Number(clip.startSeconds))} –{" "}
          {formatDuration(Number(clip.endSeconds))}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="font-display text-base font-bold leading-snug tracking-tight">
          {clip.title}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {clip.caption}
        </p>
        {clip.hashtags.length > 0 ? (
          <ul className="mt-auto flex flex-wrap gap-1.5">
            {clip.hashtags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                {tag.startsWith("#") ? tag : `#${tag}`}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

function ResultPanel({ plan }: { plan: ClipPlan }) {
  return (
    <section
      data-ocid="generator.result_panel"
      className="animate-fade-up mt-10 flex flex-col gap-6"
    >
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-panel sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
            Rencana siap
          </p>
          <h2 className="mt-1 truncate font-display text-xl font-bold tracking-tight">
            {plan.sourceTitle}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              {formatDuration(Number(plan.durationSeconds))}
            </span>
            <span>{ASPECT_RATIO_LABELS[plan.aspectRatio]}</span>
            <span>maks {formatDuration(Number(plan.maxClipSeconds))}</span>
            <span>{plan.clips.length} klip</span>
            <span>{formatTimestamp(plan.createdAt)}</span>
          </p>
        </div>
        <Button
          asChild
          className="gradient-primary shrink-0 rounded-full text-primary-foreground shadow-elevated transition-smooth hover:opacity-90"
        >
          <Link
            to="/plans/$planId"
            params={{ planId: plan.id.toString() }}
            data-ocid="generator.open_plan_link"
          >
            Buka di Pustaka
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plan.clips.map((clip) => (
          <ClipCard
            key={clip.index.toString()}
            clip={clip}
            ratio={plan.aspectRatio}
          />
        ))}
      </div>
    </section>
  );
}

export default function GeneratorPage() {
  const generate = useGeneratePlan();
  const [phase, setPhase] = useState<Phase>("idle");
  const [stageIndex, setStageIndex] = useState(0);
  const [plan, setPlan] = useState<ClipPlan | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lastValues = useRef<ClipFormValues | null>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  };

  useEffect(() => {
    return () => {
      for (const id of timers.current) window.clearTimeout(id);
      timers.current = [];
    };
  }, []);

  const runPipeline = (values: ClipFormValues) => {
    lastValues.current = values;
    clearTimers();
    setPhase("running");
    setStageIndex(0);
    setPlan(null);
    setErrorMessage(null);

    // Advance the visible stage while the backend request is in flight.
    PIPELINE_STAGES.forEach((_, index) => {
      if (index === 0) return;
      const id = window.setTimeout(() => setStageIndex(index), index * 1400);
      timers.current.push(id);
    });

    generate.mutate(
      {
        url: values.url,
        options: {
          maxClipSeconds: BigInt(values.maxClipSeconds),
          aspectRatio: values.aspectRatio,
          subtitlesEnabled: values.subtitlesEnabled,
        },
      },
      {
        onSuccess: (result) => {
          clearTimers();
          if (result.__kind__ === "ok") {
            setStageIndex(PIPELINE_STAGES.length);
            setPlan(result.ok);
            setPhase("done");
          } else {
            setErrorMessage(planErrorMessage(result.err));
            setPhase("error");
          }
        },
        onError: (error) => {
          clearTimers();
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat memproses video.",
          );
          setPhase("error");
        },
      },
    );
  };

  const handleRetry = () => {
    if (lastValues.current) runPipeline(lastValues.current);
  };

  const isRunning = phase === "running";

  return (
    <section
      data-ocid="generator.page"
      className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 md:py-20"
    >
      <div className="animate-fade-up flex flex-col items-center gap-4 text-center">
        <span className="gradient-primary flex size-12 items-center justify-center rounded-2xl shadow-elevated">
          <Sparkles className="size-6 text-primary-foreground" aria-hidden />
        </span>
        <h1 className="font-display text-4xl font-bold tracking-tight md:text-6xl">
          Ubah video panjang jadi{" "}
          <span className="gradient-text">klip viral</span>
        </h1>
        <p className="max-w-xl text-balance text-muted-foreground">
          Tempel link YouTube, pilih durasi dan rasio, lalu biarkan AI memilih
          momen terbaik beserta judul, caption, dan hashtag.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <ClipForm
          onSubmit={runPipeline}
          isPending={isRunning}
          disabled={isRunning}
        />

        <div className="flex flex-col gap-4">
          {phase === "idle" ? (
            <div
              data-ocid="generator.idle_state"
              className="animate-fade-up rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center shadow-panel"
            >
              <span className="mx-auto flex size-11 items-center justify-center rounded-2xl border border-border bg-secondary/40">
                <Hash className="size-5 text-primary" aria-hidden />
              </span>
              <p className="mt-3 font-display text-sm font-semibold tracking-tight">
                Siap memproses
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Progres tiap tahap akan tampil di sini setelah kamu menekan
                tombol.
              </p>
            </div>
          ) : null}

          {phase === "running" ? (
            <ProgressStages activeIndex={stageIndex} />
          ) : null}

          {phase === "done" ? (
            <div
              data-ocid="generator.success_state"
              className="animate-fade-up rounded-2xl border border-success/40 bg-success/10 p-5 shadow-panel"
            >
              <p className="font-display text-sm font-semibold tracking-tight text-success">
                Selesai
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Rencana klip berhasil dibuat dan disimpan ke Pustaka.
              </p>
            </div>
          ) : null}

          {phase === "error" ? (
            <div
              data-ocid="generator.error_state"
              role="alert"
              className="animate-fade-up rounded-2xl border border-destructive/40 bg-destructive/10 p-5 shadow-panel"
            >
              <p className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight text-destructive">
                <AlertTriangle className="size-4" aria-hidden />
                Gagal memproses
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {errorMessage}
              </p>
              <Button
                type="button"
                variant="outline"
                data-ocid="generator.retry_button"
                onClick={handleRetry}
                disabled={isRunning}
                className="mt-4 rounded-full border-border transition-smooth hover:border-primary/50"
              >
                <RotateCcw className="size-4" aria-hidden />
                Coba lagi
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {phase === "done" && plan ? <ResultPanel plan={plan} /> : null}
    </section>
  );
}
