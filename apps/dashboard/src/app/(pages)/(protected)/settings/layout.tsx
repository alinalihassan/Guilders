import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(pages)/(protected)/settings")({
  component: SettingsLayout,
});

function SettingsLayout() {
  return (
    <div className="mt-6 space-y-6 pb-8">
      <div className="flex-1 lg:max-w-2xl">
        <Outlet />
      </div>
    </div>
  );
}
