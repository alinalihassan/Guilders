import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { clientEnv } from "@/lib/env";

export const getSession = createServerFn().handler(async () => {
  const apiUrl = clientEnv.VITE_API_URL;
  const request = getRequest();
  const cookie = request?.headers?.get?.("cookie") ?? "";
  const res = await fetch(`${apiUrl}/api/auth/get-session`, {
    headers: { cookie },
    credentials: "include",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { user?: { id: string } | null } | null;
  return data?.user ?? null;
});
