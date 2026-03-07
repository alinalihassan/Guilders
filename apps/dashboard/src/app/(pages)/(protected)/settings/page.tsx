import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(pages)/(protected)/settings/")({
  beforeLoad: () => {
    throw redirect({ to: "/settings/account" });
  },
  component: () => null,
});
