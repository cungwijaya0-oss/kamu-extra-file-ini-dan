import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";

export interface Stage {
  id: string;
  label: string;
}

export const PIPELINE_STAGES: Stage[] = [
  { id: "fetch", label: "Mengambil info video" },
  { id: "transcript", label: "Mengambil transkrip" },
  { id: "analyse", label: "AI menganalisis" },
  { id: "clips", label: "Membuat klip" },
];

interface ProgressStagesProps {
  /** Index of the stage currently running; equals stages.length when done. */
  activeIndex: number;
  stages?: Stage[];
  className?: string;
}

export function ProgressStages({
  activeIndex,
  stages = PIPELINE_STAGES,
  className,
}: ProgressStagesProps) {
  const total = stages.length;
  const clamped = Math.max(0, Math.min(activeIndex, total));
  const percent = Math.round((clamped / total) * 100);
  const complete = clamped >= total;

  return (
    <div
      data-ocid="generator.progress_panel"
      className={cn(
        "animate-fade-up rounded-2xl border border-border bg-card p-5 shadow-panel sm:p-6",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-sm font-semibold tracking-tight">
          {complete ? "Rencana klip siap" : "Sedang memproses video"}
        </p>
        <span
          data-ocid="generator.progress_percent"
          className="font-mono text-xs text-muted-foreground"
        >
          {percent}%
        </span>
      </div>

      <div
        role="progressbar"
        tabIndex={0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Progres pemrosesan klip"
        data-ocid="generator.progress_bar"
        className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-secondary"
      >
        <div
          className="gradient-primary h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ol className="mt-5 flex flex-col gap-3">
        {stages.map((stage, index) => {
          const isDone = index < clamped;
          const isActive = index === clamped && !complete;
          return (
            <li
              key={stage.id}
              data-ocid={`generator.stage.${index + 1}`}
              className="flex items-center gap-3"
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-smooth",
                  isDone
                    ? "gradient-primary border-transparent text-primary-foreground"
                    : isActive
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border bg-secondary/40 text-muted-foreground",
                )}
              >
                {isDone ? (
                  <Check className="size-3.5" aria-hidden />
                ) : isActive ? (
                  <Loader2
                    className="size-3.5 animate-spin motion-reduce:animate-none"
                    aria-hidden
                  />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(
                  "text-sm transition-smooth",
                  isDone || isActive
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {stage.label}
              </span>
              {isActive ? (
                <span className="ml-auto font-mono text-[11px] uppercase tracking-wider text-primary">
                  berjalan
                </span>
              ) : isDone ? (
                <span className="ml-auto font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  selesai
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
