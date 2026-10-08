import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  ASPECT_RATIO_HINTS,
  ASPECT_RATIO_LABELS,
  ASPECT_RATIO_OPTIONS,
  AspectRatio,
  DURATION_OPTIONS,
} from "@/types";
import { AlertCircle, Link2, Sparkles } from "lucide-react";
import { useState } from "react";

export interface ClipFormValues {
  url: string;
  maxClipSeconds: number;
  aspectRatio: AspectRatio;
  subtitlesEnabled: boolean;
}

interface ClipFormProps {
  onSubmit: (values: ClipFormValues) => void;
  isPending: boolean;
  disabled?: boolean;
}

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

/** Accept watch, youtu.be, Shorts and embed link forms; reject anything else. */
function validateYouTubeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "Tempel link YouTube terlebih dahulu.";
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return "Format link tidak valid. Contoh: https://youtu.be/xxxxxxxxxxx";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "Gunakan link yang diawali http:// atau https://.";
  }
  const host = parsed.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) {
    return "Link ini bukan dari YouTube. Gunakan link video YouTube.";
  }
  if (host === "youtu.be" || host === "www.youtu.be") {
    const id = parsed.pathname.replace(/^\/+/, "").split("/")[0];
    if (!id) return "Link YouTube tidak memuat ID video.";
    return null;
  }
  const path = parsed.pathname;
  const isWatch = path === "/watch" && parsed.searchParams.has("v");
  const isShorts = path.startsWith("/shorts/");
  const isEmbed = path.startsWith("/embed/");
  const isLive = path.startsWith("/live/");
  if (!isWatch && !isShorts && !isEmbed && !isLive) {
    return "Link YouTube tidak dikenali. Gunakan link watch, youtu.be, Shorts, atau embed.";
  }
  return null;
}

export function ClipForm({ onSubmit, isPending, disabled }: ClipFormProps) {
  const [url, setUrl] = useState("");
  const [maxClipSeconds, setMaxClipSeconds] = useState(60);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    AspectRatio.portrait,
  );
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateYouTubeUrl(url);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onSubmit({
      url: url.trim(),
      maxClipSeconds,
      aspectRatio,
      subtitlesEnabled,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      data-ocid="generator.form"
      className="gradient-border animate-fade-up rounded-2xl bg-card p-5 shadow-panel sm:p-7"
    >
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="youtube-url"
          className="font-display text-sm font-semibold tracking-tight"
        >
          Link video YouTube
        </Label>
        <div className="relative">
          <Link2
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="youtube-url"
            data-ocid="generator.url_input"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              if (error) setError(null);
            }}
            placeholder="Tempel link YouTube di sini..."
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "youtube-url-error" : undefined}
            className="h-12 rounded-xl border-input bg-background/60 pl-10 text-sm transition-smooth focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        {error ? (
          <p
            id="youtube-url-error"
            data-ocid="generator.url_error"
            role="alert"
            className="flex items-start gap-2 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Mendukung link watch, youtu.be, Shorts, dan embed.
          </p>
        )}
      </div>

      <fieldset className="mt-6 border-0 p-0">
        <legend className="font-display text-sm font-semibold tracking-tight">
          Durasi maksimal klip
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((option) => {
            const active = option.seconds === maxClipSeconds;
            return (
              <button
                key={option.seconds}
                type="button"
                data-ocid={`generator.duration_chip.${option.seconds}`}
                aria-pressed={active}
                onClick={() => setMaxClipSeconds(option.seconds)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  active
                    ? "gradient-primary border-transparent text-primary-foreground shadow-elevated"
                    : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-6 border-0 p-0">
        <legend className="font-display text-sm font-semibold tracking-tight">
          Rasio aspek
        </legend>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {ASPECT_RATIO_OPTIONS.map((ratio) => {
            const active = ratio === aspectRatio;
            return (
              <button
                key={ratio}
                type="button"
                data-ocid={`generator.ratio_chip.${ratio}`}
                aria-pressed={active}
                onClick={() => setAspectRatio(ratio)}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-xl border px-4 py-3 text-left transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  active
                    ? "border-primary/60 bg-primary/10 shadow-elevated"
                    : "border-border bg-secondary/30 hover:border-primary/40 hover:bg-secondary/50",
                )}
              >
                <span
                  className={cn(
                    "font-display text-base font-bold tracking-tight",
                    active ? "gradient-text" : "text-foreground",
                  )}
                >
                  {ASPECT_RATIO_LABELS[ratio]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {ASPECT_RATIO_HINTS[ratio]}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/30 px-4 py-3">
        <div className="min-w-0">
          <Label
            htmlFor="subtitles-toggle"
            className="font-display text-sm font-semibold tracking-tight"
          >
            Subtitle otomatis
          </Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Sertakan saran subtitle pada tiap klip.
          </p>
        </div>
        <Switch
          id="subtitles-toggle"
          data-ocid="generator.subtitles_switch"
          checked={subtitlesEnabled}
          onCheckedChange={setSubtitlesEnabled}
          aria-label="Aktifkan subtitle otomatis"
        />
      </div>

      <Button
        type="submit"
        data-ocid="generator.submit_button"
        disabled={isPending || disabled}
        className="gradient-primary mt-6 h-12 w-full rounded-full text-base font-semibold text-primary-foreground shadow-elevated transition-smooth hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60"
      >
        <Sparkles className="size-5" aria-hidden />
        {isPending ? "Memproses..." : "Mulai Proses AI"}
      </Button>
    </form>
  );
}
