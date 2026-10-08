# Design Brief

## Direction

KLIPPER AI PRO — "Neon Studio": a dark, confident AI video-clipper workspace where a violet→pink gradient drives the processing pipeline, not the whole page.

## Tone

Premium modern tech — deep ink-violet surfaces with restrained gradient energy, closer to Linear/Vercel than to a gaming RGB aesthetic.

## Differentiation

The pipeline itself is the hero: a gradient progress spine with a moving shimmer, monospace stage codes (`01 FETCH · 02 TRANSKRIP · 03 AI ANALISIS · 04 GENERATE CLIPS`), and per-stage status dots that make a background job feel like a live instrument.

## Color Palette

| Token      | OKLCH          | Role                                              |
| ---------- | -------------- | ------------------------------------------------- |
| background | 0.15 0.018 285 | Deep ink-violet app canvas                        |
| foreground | 0.95 0.01 290  | Primary text                                      |
| card       | 0.19 0.022 288 | Elevated panels, input card, clip cards           |
| primary    | 0.62 0.24 295  | Vivid violet — CTAs, active states, focus ring    |
| accent     | 0.68 0.24 350  | Hot pink — gradient end, highlights, hashtags     |
| muted      | 0.24 0.028 288 | Inactive chips, secondary surfaces, stage rail    |
| success    | 0.7 0.16 155   | Completed stages, ready state                     |
| warning    | 0.78 0.15 80   | Stage in-progress / caution                       |
| destructive| 0.62 0.2 22    | Errors, invalid link, delete                      |

## Typography

- Display: Space Grotesk — hero headline, section headings, clip titles, wordmark.
- Body: DM Sans — paragraphs, labels, form controls, buttons.
- Mono: JetBrains Mono — timestamps, stage codes, duration/ratio badges, hashtags.
- Scale: hero `text-4xl md:text-6xl font-bold tracking-tight`, h2 `text-2xl md:text-3xl font-bold tracking-tight`, label `text-xs font-semibold tracking-widest uppercase`, body `text-base`.

## Elevation & Depth

Three tiers: flat `bg-background` canvas, `bg-card` panels with `shadow-panel` + `border-border`, and a single `shadow-elevated` violet-tinted lift for the active input card and open clip cards; depth comes from borders and inset highlights, never from glow.

## Structural Zones

| Zone    | Background              | Border              | Notes                                                        |
| ------- | ----------------------- | ------------------- | ------------------------------------------------------------ |
| Header  | `bg-card/80` backdrop   | `border-b`          | Sticky; gradient logo mark + wordmark left, ghost "Pustaka" right |
| Content | `bg-background`         | —                   | Hero + input card, then `gradient-subtle` band for progress, then library grid |
| Footer  | `bg-muted/40`           | `border-t`          | Compact, mono tagline, muted text                            |

## Spacing & Rhythm

Generous section gaps (`py-16 md:py-24`), content max-width `max-w-6xl`, 24px card padding, 12–16px internal grouping, 8px micro-gaps inside chips and stage rows.

## Component Patterns

- Buttons: pill (`rounded-full`) gradient fill for primary "Mulai Proses AI", `rounded-xl` secondary/ghost with border, hover lifts to `shadow-elevated` + slight scale.
- Cards: `rounded-2xl` `bg-card` with `border-border` and `shadow-panel`; the URL input card gets a gradient border on focus.
- Badges: pill chips for duration/ratio (`bg-muted`, active = `gradient-primary`), mono timestamp badges, violet-tinted hashtag chips.

## Motion

- Entrance: `animate-fade-up` on hero and cards, staggered 60–80ms; `animate-fade-in` on the library.
- Hover: `transition-smooth` (0.3s) on all interactive elements — border brightens, shadow lifts, chips fill.
- Decorative: `animate-shimmer` sweep across the active progress fill, `animate-pulse-dot` on the in-progress stage marker, `animate-float` on the ambient hero orb.

## Constraints

- Dark mode is the primary and default theme; light tokens exist only as an AA+ fallback.
- Gradient is reserved for CTAs, hero text, progress fill, and active chips — never a full-page background.
- No neon/glow shadows; depth via borders, inset highlights, and tinted elevation.
- All copy in Indonesian where the user wrote it (e.g. "Mulai Proses AI", "Tempel link YouTube").
- Token-only styling: no raw hex, `rgb()`, or arbitrary `bg-[#...]` classes in components.

## Signature Detail

The gradient progress spine — a violet→pink bar with a travelling shimmer and monospace stage codes — turns pipeline status into the app's most memorable visual element.
