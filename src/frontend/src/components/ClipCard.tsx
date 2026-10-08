import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/types";
import type { Clip } from "@/types";
import { Check, Clock, Copy, Hash, Type } from "lucide-react";
import { useState } from "react";

/** Copy text to the clipboard, falling back to a hidden textarea. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

function CopyButton({
  label,
  value,
  ocid,
}: {
  label: string;
  value: string;
  ocid: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyText(value);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      data-ocid={ocid}
      onClick={handleCopy}
      aria-label={`Salin ${label}`}
      className="rounded-full border-border bg-secondary/40 text-muted-foreground transition-smooth hover:border-primary/50 hover:text-foreground"
    >
      {copied ? (
        <Check className="size-3.5 text-success" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      {copied ? "Tersalin" : "Salin"}
    </Button>
  );
}

export function ClipCard({
  clip,
  position,
}: {
  clip: Clip;
  position: number;
}) {
  const hashtagText = clip.hashtags.join(" ");

  return (
    <article
      data-ocid={`plan_detail.clip.${position}`}
      className="gradient-border animate-fade-up flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-panel transition-smooth hover:shadow-elevated"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="gradient-primary flex size-9 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold text-primary-foreground shadow-elevated">
            {String(position).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-semibold leading-tight text-foreground">
              {clip.title}
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <Clock className="size-3.5" aria-hidden />
              {formatDuration(Number(clip.startSeconds))} –{" "}
              {formatDuration(Number(clip.endSeconds))}
            </p>
          </div>
        </div>
        <Badge
          variant="secondary"
          className="shrink-0 rounded-full border border-border bg-secondary/60 font-mono text-[11px] text-muted-foreground"
        >
          {formatDuration(Number(clip.endSeconds) - Number(clip.startSeconds))}
        </Badge>
      </header>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <Type className="size-3.5" aria-hidden />
            Caption
          </span>
          <CopyButton
            label="caption"
            value={clip.caption}
            ocid={`plan_detail.copy_caption.${position}`}
          />
        </div>
        <p className="rounded-xl border border-border bg-background/60 p-3 text-sm leading-relaxed text-foreground/90">
          {clip.caption}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <Hash className="size-3.5" aria-hidden />
            Hashtag
          </span>
          <CopyButton
            label="hashtag"
            value={hashtagText}
            ocid={`plan_detail.copy_hashtags.${position}`}
          />
        </div>
        {clip.hashtags.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {clip.hashtags.map((tag) => (
              <li key={tag}>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full border-primary/30 bg-primary/10 font-mono text-[11px] text-primary",
                  )}
                >
                  {tag.startsWith("#") ? tag : `#${tag}`}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            Tidak ada hashtag untuk klip ini.
          </p>
        )}
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <span className="truncate text-xs text-muted-foreground">
          {clip.title}
        </span>
        <CopyButton
          label="judul"
          value={clip.title}
          ocid={`plan_detail.copy_title.${position}`}
        />
      </footer>
    </article>
  );
}
