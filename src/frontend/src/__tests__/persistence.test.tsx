import { renderWithActor } from "@/__tests__/test-utils";
import type { Clip, ClipPlan, backendInterface } from "@/backend";
import { AspectRatio } from "@/backend";
import GeneratorPage from "@/pages/GeneratorPage";
import LibraryPage from "@/pages/LibraryPage";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

const KNOWN_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

/** Mount a page inside a loaded memory router so <Link> resolves. */
async function renderInRouter(ui: ReactElement, initialPath = "/") {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => ui,
  });
  const libraryRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/library",
    component: () => ui,
  });
  const planRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/plans/$planId",
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, libraryRoute, planRoute]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
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
    name: "Judul Video — 1700000000000000000",
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

describe("saved plan persistence", () => {
  it("shows a generated plan in the library with its unique name", async () => {
    const user = userEvent.setup();
    const plan = makePlan();
    const generatePlan = vi
      .fn<backendInterface["generatePlan"]>()
      .mockResolvedValue({ __kind__: "ok", ok: plan });
    const listPlans = vi
      .fn<backendInterface["listPlans"]>()
      .mockResolvedValue([plan]);
    const deletePlan = vi.fn<backendInterface["deletePlan"]>();

    // 1. Generate a plan on the generator route.
    renderWithActor(
      <RouterProvider router={await renderInRouter(<GeneratorPage />, "/")} />,
      { generatePlan } satisfies Pick<backendInterface, "generatePlan">,
    );

    await user.type(screen.getByTestId("generator.url_input"), KNOWN_URL);
    await user.click(screen.getByRole("button", { name: /Mulai Proses AI/i }));
    await waitFor(() => expect(generatePlan).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByTestId("generator.result_panel"),
    ).toBeInTheDocument();

    // 2. A fresh mount of the library (as after a page refresh) reads the
    //    persisted plan back from the backend and lists it by its unique name.
    renderWithActor(
      <RouterProvider
        router={await renderInRouter(<LibraryPage />, "/library")}
      />,
      { listPlans, deletePlan } satisfies Pick<
        backendInterface,
        "listPlans" | "deletePlan"
      >,
    );

    expect(await screen.findByText(plan.name)).toBeInTheDocument();
    expect(screen.getByTestId("library.plan.1")).toBeInTheDocument();
    expect(listPlans).toHaveBeenCalledTimes(1);
  });

  it("keeps two plans with distinct names distinguishable in the library", async () => {
    const first = makePlan({
      id: 1n,
      name: "Video Satu — 1700000000000000000",
      createdAt: 1_700_000_000_000_000_000n,
    });
    const second = makePlan({
      id: 2n,
      name: "Video Dua — 1700000001000000000",
      createdAt: 1_700_000_001_000_000_000n,
    });
    const listPlans = vi
      .fn<backendInterface["listPlans"]>()
      .mockResolvedValue([first, second]);
    const deletePlan = vi.fn<backendInterface["deletePlan"]>();

    renderWithActor(
      <RouterProvider
        router={await renderInRouter(<LibraryPage />, "/library")}
      />,
      { listPlans, deletePlan } satisfies Pick<
        backendInterface,
        "listPlans" | "deletePlan"
      >,
    );

    expect(await screen.findByText(first.name)).toBeInTheDocument();
    expect(screen.getByText(second.name)).toBeInTheDocument();
    // Newest first: the second plan (later createdAt) is position 1.
    expect(screen.getByTestId("library.plan.1")).toHaveTextContent(second.name);
    expect(screen.getByTestId("library.plan.2")).toHaveTextContent(first.name);
  });
});
