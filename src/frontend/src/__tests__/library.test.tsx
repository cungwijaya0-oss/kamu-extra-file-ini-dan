import { renderWithActor } from "@/__tests__/test-utils";
import type { Clip, ClipPlan, backendInterface } from "@/backend";
import { AspectRatio } from "@/backend";
import LibraryPage from "@/pages/LibraryPage";
import PlanDetailPage from "@/pages/PlanDetailPage";
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

async function renderInRouter(ui: ReactElement, initialPath = "/") {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => null,
  });
  const libraryRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/library",
    component: () => ui,
  });
  const planRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/plans/$planId",
    component: () => ui,
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
    startSeconds: 12n,
    endSeconds: 42n,
    title: "Momen lucu",
    caption: "Caption menarik untuk klip ini",
    hashtags: ["viral", "shorts"],
    ...overrides,
  };
}

function makePlan(overrides: Partial<ClipPlan> = {}): ClipPlan {
  return {
    id: 7n,
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

describe("LibraryPage", () => {
  it("lists saved plans with a unique name and clip count", async () => {
    const plan = makePlan();
    const listPlans = vi
      .fn<backendInterface["listPlans"]>()
      .mockResolvedValue([plan]);
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

    expect(await screen.findByText("Judul Video — 123")).toBeInTheDocument();
    expect(screen.getByTestId("library.plan.1")).toBeInTheDocument();
    expect(screen.getByText("Judul Video")).toBeInTheDocument();
  });

  it("shows an empty state when no plans are saved", async () => {
    const listPlans = vi
      .fn<backendInterface["listPlans"]>()
      .mockResolvedValue([]);
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

    expect(
      await screen.findByTestId("library.empty_state"),
    ).toBeInTheDocument();
  });
});

describe("PlanDetailPage", () => {
  it("renders clip timestamps, caption and hashtags", async () => {
    const plan = makePlan();
    const getPlan = vi
      .fn<backendInterface["getPlan"]>()
      .mockResolvedValue(plan);
    const deletePlan = vi.fn<backendInterface["deletePlan"]>();
    renderWithActor(
      <RouterProvider
        router={await renderInRouter(<PlanDetailPage />, "/plans/7")}
      />,
      { getPlan, deletePlan } satisfies Pick<
        backendInterface,
        "getPlan" | "deletePlan"
      >,
    );

    expect(await screen.findByTestId("plan_detail.clip.1")).toBeInTheDocument();
    expect(screen.getByText("0:12 – 0:42")).toBeInTheDocument();
    expect(
      screen.getByText("Caption menarik untuk klip ini"),
    ).toBeInTheDocument();
    expect(screen.getByText("#viral")).toBeInTheDocument();
    expect(screen.getByText("#shorts")).toBeInTheDocument();
  });

  it("copies a clip caption to the clipboard", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const plan = makePlan();
    const getPlan = vi
      .fn<backendInterface["getPlan"]>()
      .mockResolvedValue(plan);
    const deletePlan = vi.fn<backendInterface["deletePlan"]>();
    renderWithActor(
      <RouterProvider
        router={await renderInRouter(<PlanDetailPage />, "/plans/7")}
      />,
      { getPlan, deletePlan } satisfies Pick<
        backendInterface,
        "getPlan" | "deletePlan"
      >,
    );

    await user.click(await screen.findByTestId("plan_detail.copy_caption.1"));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("Caption menarik untuk klip ini"),
    );
    expect(await screen.findByText("Tersalin")).toBeInTheDocument();
  });

  it("downloads the plan as a text file", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn().mockReturnValue("blob:plan");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    const plan = makePlan();
    const getPlan = vi
      .fn<backendInterface["getPlan"]>()
      .mockResolvedValue(plan);
    const deletePlan = vi.fn<backendInterface["deletePlan"]>();
    renderWithActor(
      <RouterProvider
        router={await renderInRouter(<PlanDetailPage />, "/plans/7")}
      />,
      { getPlan, deletePlan } satisfies Pick<
        backendInterface,
        "getPlan" | "deletePlan"
      >,
    );

    await user.click(await screen.findByTestId("plan_detail.download_button"));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toContain("text/plain");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Terunduh")).toBeInTheDocument();
  });
});
