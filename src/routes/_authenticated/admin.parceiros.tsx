import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/parceiros")({
  staticData: { sitemap: false },
  component: () => <Outlet />,
});
