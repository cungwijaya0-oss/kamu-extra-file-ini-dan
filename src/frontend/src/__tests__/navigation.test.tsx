import { renderWithActor } from "@/__tests__/test-utils";
import type { Clip, ClipPlan, backendInterface } from "@/backend";
import { AspectRatio } from "@/backend";
import { Layout } from "@/components/Layout";
import GeneratorPage from "@/pages/GeneratorPage";
import LibraryPage from "@/pages/LibraryPage";
import PlanDetailPage from "@/pages/PlanDetailPage";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const KNOWN_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

/**
 * Build the real route tree (Layout + the three pages) so navigation between
 * routes is exercised the way the deployed app wires it in App.tsx.
 */
async function renderApp(initialPath: string) {
  const rootRoute = createRootRoute({
    component: () => (
      <Layout>
        <Outlet />
      </Layout>
    ),
  });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: GeneratorPage,
  });
  const libraryRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/library",
    component: LibraryPage,
  });
  const planRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/plans/$planId",
    component: PlanDetailPage,
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

describe("default route", () => {
  it("renders the generator page inside the layout without a blank screen", async () => {
    const generatePlan = vi.fn<backendInterface["generatePlan"]>();
    renderWithActor(<RouterProvider router={await renderApp("/")} />, {
      generatePlan,
    } satisfies Pick<backendInterface, "generatePlan">);

    expect(screen.getByTestId("generator.page")).toBeInTheDocument();
    expect(screen.getByTestId("generator.url_input")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Mulai Proses AI/i }),
    ).toBeInTheDocument();
    // The shared layout chrome is present on the default route.
    expect(screen.getByTestId("nav.home_link")).toBeInTheDocument();
    expect(screen.getByTestId("nav.pustaka_link")).toBeInTheDocument();
  });
});

describe("library to plan detail journey", () => {
  it("opens a saved plan from the library and shows its clips", async () => {
    const user = userEvent.setup();
    const plan = makePlan();
    const listPlans = vi
      .fn<backendInterface["listPlans"]>()
      .mockResolvedValue([plan]);
    const getPlan = vi
      .fn<backendInterface["getPlan"]>()
      .mockResolvedValue(plan);
    const deletePlan = vi.fn<backendInterface["deletePlan"]>();

    renderWithActor(<RouterProvider router={await renderApp("/library")} />, {
      listPlans,
      getPlan,
      deletePlan,
    } satisfies Pick<backendInterface, "listPlans" | "getPlan" | "deletePlan">);

    // The library lists the saved plan.
    expect(await screen.findByText(plan.name)).toBeInTheDocument();

    // Opening it navigates to the detail route and loads the plan by id.
    await user.click(screen.getByTestId("library.open_button.1"));

    expect(await screen.findByTestId("plan_detail.page")).toBeInTheDocument();
    expect(await screen.findByTestId("plan_detail.clip.1")).toBeInTheDocument();
    expect(screen.getByText("0:12 – 0:42")).toBeInTheDocument();
    expect(
      screen.getByText("Caption menarik untuk klip ini"),
    ).toBeInTheDocument();
    expect(getPlan).toHaveBeenCalledWith(7n);
  });
});

describe("library delete flow", () => {
  it("removes a plan from the library after confirming deletion", async () => {
    const user = userEvent.setup();
    const plan = makePlan();
    const listPlans = vi
      .fn<backendInterface["listPlans"]>()
      .mockResolvedValue([plan]);
    const deletePlan = vi
      .fn<backendInterface["deletePlan"]>()
      .mockResolvedValue(true);

    renderWithActor(<RouterProvider router={await renderApp("/library")} />, {
      listPlans,
      deletePlan,
    } satisfies Pick<backendInterface, "listPlans" | "deletePlan">);

    await screen.findByText(plan.name);
    await user.click(screen.getByTestId("library.delete_button.1"));

    // The confirmation dialog names the plan before anything is deleted.
    expect(
      await screen.findByTestId("library.delete_modal"),
    ).toBeInTheDocument();
    expect(deletePlan).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("library.confirm_button"));

    await waitFor(() => expect(deletePlan).toHaveBeenCalledWith(7n));
    // The dialog closes once the delete succeeds.
    await waitFor(() =>
      expect(
        screen.queryByTestId("library.delete_modal"),
      ).not.toBeInTheDocument(),
    );
  });
});
