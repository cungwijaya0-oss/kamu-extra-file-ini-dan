import { Layout } from "@/components/Layout";
import GeneratorPage from "@/pages/GeneratorPage";
import LibraryPage from "@/pages/LibraryPage";
import PlanDetailPage from "@/pages/PlanDetailPage";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});

const generatorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: GeneratorPage,
});

const libraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/library",
  component: LibraryPage,
});

const planDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/plans/$planId",
  component: PlanDetailPage,
});

const routeTree = rootRoute.addChildren([
  generatorRoute,
  libraryRoute,
  planDetailRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
