import { renderWithActor } from "@/__tests__/test-utils";
import type { Clip, ClipPlan, backendInterface } from "@/backend";
import { AspectRatio } from "@/backend";
import GeneratorPage from "@/pages/GeneratorPage";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

const KNOWN_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

/** Mount a page inside a loaded memory router so <Link> resolves. */
async function renderInRouter(ui: ReactElement) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => ui,
  });
  const planRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/plans/$planId",
    component: () => null,
  });
  const libraryRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/library",
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, planRoute, libraryRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await router.load();
  return router;
}

function makeClip(overrides: Partial<Clip> = {}): Clip {
  return {
    index: 0n,
    startSeconds: 0n,
    endSeconds: 30n,
    title: "Momen lucu",
    caption: "Caption menarik untuk klip ini",
    hashtags: ["viral", "shorts"],
    ...overrides,
  };
}

function makePlan(overrides: Partial<ClipPlan> = {}): ClipPlan {
  return {
    id: 1n,
    owner: { toText: () => "aaaaa-aa" } as unknown as ClipPlan["owner"],
    name: "Judul Video — 123",
    createdAt: 1_700_000_000_000_000_000n,
    sourceUrl: KNOWN_URL,
    sourceTitle: "Judul Video",
    channel: "Channel",
    durationSeconds: 180n,
    language: "en",
    maxClipSeconds: 60n,
    aspectRatio: AspectRatio.portrait,
    subtitlesEnabled: true,
    clips: [makeClip()],
    ...overrides,
  };
}

function makeActor(
  generatePlan: backendInterface["generatePlan"],
): Pick<backendInterface, "generatePlan"> {
  return { generatePlan };
}

async function renderGenerator(generatePlan: backendInterface["generatePlan"]) {
  const router = await renderInRouter(<GeneratorPage />);
  return renderWithActor(
    <RouterProvider router={router} />,
    makeActor(generatePlan),
  );
}

describe("GeneratorPage", () => {
  it("renders the form without a blank screen", async () => {
    const generatePlan = vi.fn<backendInterface["generatePlan"]>();
    await renderGenerator(generatePlan);

    expect(screen.getByTestId("generator.page")).toBeInTheDocument();
    expect(screen.getByTestId("generator.url_input")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Mulai Proses AI/i }),
    ).toBeInTheDocument();
  });

  it("rejects a non-YouTube link with a clear error and no backend call", async () => {
    const user = userEvent.setup();
    const generatePlan = vi.fn<backendInterface["generatePlan"]>();
    await renderGenerator(generatePlan);

    await user.type(
      screen.getByTestId("generator.url_input"),
      "https://example.com/watch?v=abc",
    );
    await user.click(screen.getByRole("button", { name: /Mulai Proses AI/i }));

    expect(await screen.findByTestId("generator.url_error")).toHaveTextContent(
      /bukan dari YouTube/i,
    );
    expect(generatePlan).not.toHaveBeenCalled();
  });

  it("generates a plan with clips, timestamps and copy for a valid link", async () => {
    const user = userEvent.setup();
    const plan = makePlan();
    const generatePlan = vi
      .fn<backendInterface["generatePlan"]>()
      .mockResolvedValue({ __kind__: "ok", ok: plan });
    await renderGenerator(generatePlan);

    await user.type(screen.getByTestId("generator.url_input"), KNOWN_URL);
    await user.click(screen.getByTestId("generator.duration_chip.30"));
    await user.click(screen.getByTestId("generator.ratio_chip.landscape"));
    await user.click(screen.getByRole("button", { name: /Mulai Proses AI/i }));

    await waitFor(() => expect(generatePlan).toHaveBeenCalledTimes(1));
    expect(generatePlan).toHaveBeenCalledWith({
      url: KNOWN_URL,
      options: {
        maxClipSeconds: 30n,
        aspectRatio: AspectRatio.landscape,
        subtitlesEnabled: true,
      },
    });

    expect(
      await screen.findByTestId("generator.result_panel"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("generator.clip_card.1")).toBeInTheDocument();
    expect(screen.getByTestId("generator.clip_timestamp.1")).toHaveTextContent(
      "0:00 – 0:30",
    );
    expect(screen.getByText("Momen lucu")).toBeInTheDocument();
    expect(
      screen.getByText("Caption menarik untuk klip ini"),
    ).toBeInTheDocument();
    expect(screen.getByText("#viral")).toBeInTheDocument();
    expect(screen.getByText("#shorts")).toBeInTheDocument();
  });

  it("renders every clip of a multi-clip plan with its own copy and timestamps", async () => {
    const user = userEvent.setup();
    const plan = makePlan({
      clips: [
        makeClip({
          index: 0n,
          startSeconds: 0n,
          endSeconds: 30n,
          title: "Klip pertama",
          caption: "Caption pertama",
          hashtags: ["satu"],
        }),
        makeClip({
          index: 1n,
          startSeconds: 45n,
          endSeconds: 75n,
          title: "Klip kedua",
          caption: "Caption kedua",
          hashtags: ["dua", "tiga"],
        }),
      ],
    });
    const generatePlan = vi
      .fn<backendInterface["generatePlan"]>()
      .mockResolvedValue({ __kind__: "ok", ok: plan });
    await renderGenerator(generatePlan);

    await user.type(screen.getByTestId("generator.url_input"), KNOWN_URL);
    await user.click(screen.getByRole("button", { name: /Mulai Proses AI/i }));

    await screen.findByTestId("generator.result_panel");
    // At least one clip is shown, and each clip keeps its own copy.
    expect(screen.getByTestId("generator.clip_card.1")).toBeInTheDocument();
    expect(screen.getByTestId("generator.clip_card.2")).toBeInTheDocument();
    expect(screen.getByText("Klip pertama")).toBeInTheDocument();
    expect(screen.getByText("Klip kedua")).toBeInTheDocument();
    expect(screen.getByText("Caption pertama")).toBeInTheDocument();
    expect(screen.getByText("Caption kedua")).toBeInTheDocument();
    expect(screen.getByText("#satu")).toBeInTheDocument();
    expect(screen.getByText("#dua")).toBeInTheDocument();
    expect(screen.getByText("#tiga")).toBeInTheDocument();
    expect(screen.getByTestId("generator.clip_timestamp.1")).toHaveTextContent(
      "0:00 – 0:30",
    );
    expect(screen.getByTestId("generator.clip_timestamp.2")).toHaveTextContent(
      "0:45 – 1:15",
    );
  });

  it("shows a clear error when the video has no captions", async () => {
    const user = userEvent.setup();
    const generatePlan = vi
      .fn<backendInterface["generatePlan"]>()
      .mockResolvedValue({
        __kind__: "err",
        err: { __kind__: "noCaptions", noCaptions: "" },
      });
    await renderGenerator(generatePlan);

    await user.type(screen.getByTestId("generator.url_input"), KNOWN_URL);
    await user.click(screen.getByRole("button", { name: /Mulai Proses AI/i }));

    const error = await screen.findByTestId("generator.error_state");
    expect(error).toHaveTextContent(/tidak memiliki transkrip/i);
    expect(
      screen.queryByTestId("generator.result_panel"),
    ).not.toBeInTheDocument();
  });

  it("shows a clear error when the video cannot be reached", async () => {
    const user = userEvent.setup();
    const generatePlan = vi
      .fn<backendInterface["generatePlan"]>()
      .mockResolvedValue({
        __kind__: "err",
        err: { __kind__: "unreachable", unreachable: "" },
      });
    await renderGenerator(generatePlan);

    await user.type(screen.getByTestId("generator.url_input"), KNOWN_URL);
    await user.click(screen.getByRole("button", { name: /Mulai Proses AI/i }));

    const error = await screen.findByTestId("generator.error_state");
    expect(error).toHaveTextContent(/tidak dapat dijangkau/i);
    expect(
      screen.queryByTestId("generator.result_panel"),
    ).not.toBeInTheDocument();
  });

  it("advances the progress bar through named stages and reaches completion", async () => {
    const user = userEvent.setup();
    let resolveGenerate: (value: { __kind__: "ok"; ok: ClipPlan }) => void =
      () => {};
    const generatePlan = vi
      .fn<backendInterface["generatePlan"]>()
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveGenerate = resolve;
          }),
      );
    await renderGenerator(generatePlan);

    await user.type(screen.getByTestId("generator.url_input"), KNOWN_URL);
    await user.click(screen.getByRole("button", { name: /Mulai Proses AI/i }));

    const progress = await screen.findByTestId("generator.progress_panel");
    expect(progress).toBeInTheDocument();
    expect(screen.getByText("Mengambil info video")).toBeInTheDocument();
    expect(screen.getByText("Mengambil transkrip")).toBeInTheDocument();
    expect(screen.getByText("AI menganalisis")).toBeInTheDocument();
    expect(screen.getByText("Membuat klip")).toBeInTheDocument();

    resolveGenerate({ __kind__: "ok", ok: makePlan() });

    expect(
      await screen.findByTestId("generator.success_state"),
    ).toHaveTextContent(/Selesai/i);
    expect(
      screen.queryByTestId("generator.progress_panel"),
    ).not.toBeInTheDocument();
  });

  it("advances the progress bar percent as named stages elapse", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let resolveGenerate: (value: { __kind__: "ok"; ok: ClipPlan }) => void =
      () => {};
    const generatePlan = vi
      .fn<backendInterface["generatePlan"]>()
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveGenerate = resolve;
          }),
      );
    await renderGenerator(generatePlan);

    // fireEvent keeps the interaction synchronous so the faked timeouts are
    // the only pending timers; user-event would await its own internal delays.
    fireEvent.change(screen.getByTestId("generator.url_input"), {
      target: { value: KNOWN_URL },
    });
    fireEvent.click(screen.getByRole("button", { name: /Mulai Proses AI/i }));

    const percent = screen.getByTestId("generator.progress_percent");
    expect(percent).toHaveTextContent("0%");

    // Each stage advances every 1400ms; 4 stages => 25% per step.
    await act(async () => {
      vi.advanceTimersByTime(1400);
    });
    expect(screen.getByTestId("generator.progress_percent")).toHaveTextContent(
      "25%",
    );

    await act(async () => {
      vi.advanceTimersByTime(1400);
    });
    expect(screen.getByTestId("generator.progress_percent")).toHaveTextContent(
      "50%",
    );

    await act(async () => {
      vi.advanceTimersByTime(2800);
    });
    // The last named stage is active while the request is still in flight.
    expect(screen.getByTestId("generator.progress_percent")).toHaveTextContent(
      "75%",
    );
    expect(screen.getByText("Membuat klip")).toBeInTheDocument();

    // Completion is driven by the resolved request, not by the stage timers.
    await act(async () => {
      resolveGenerate({ __kind__: "ok", ok: makePlan() });
    });
    expect(screen.getByTestId("generator.success_state")).toHaveTextContent(
      /Selesai/i,
    );
  });

  it("keeps every generated clip within the chosen max duration", async () => {
    const user = userEvent.setup();
    const plan = makePlan({
      maxClipSeconds: 30n,
      clips: [
        makeClip({ index: 0n, startSeconds: 0n, endSeconds: 30n }),
        makeClip({ index: 1n, startSeconds: 45n, endSeconds: 70n }),
      ],
    });
    const generatePlan = vi
      .fn<backendInterface["generatePlan"]>()
      .mockResolvedValue({ __kind__: "ok", ok: plan });
    await renderGenerator(generatePlan);

    await user.type(screen.getByTestId("generator.url_input"), KNOWN_URL);
    await user.click(screen.getByTestId("generator.duration_chip.30"));
    await user.click(screen.getByRole("button", { name: /Mulai Proses AI/i }));

    await waitFor(() => expect(generatePlan).toHaveBeenCalledTimes(1));
    expect(generatePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ maxClipSeconds: 30n }),
      }),
    );

    await screen.findByTestId("generator.result_panel");
    const first = screen.getByTestId("generator.clip_timestamp.1");
    const second = screen.getByTestId("generator.clip_timestamp.2");
    expect(first).toHaveTextContent("0:00 – 0:30");
    expect(second).toHaveTextContent("0:45 – 1:10");

    // Parse the rendered "m:ss – m:ss" ranges and assert none exceeds 30s.
    const toSeconds = (value: string) => {
      const [m, s] = value.split(":").map(Number);
      return m * 60 + s;
    };
    for (const node of [first, second]) {
      const [start, end] = node.textContent!.split("–").map((p) => p.trim());
      expect(toSeconds(end) - toSeconds(start)).toBeLessThanOrEqual(30);
    }
  });
});
