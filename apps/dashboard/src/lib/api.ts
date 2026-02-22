import { treaty } from "@elysiajs/eden";
import { env } from "@/lib/env";
import type { App as ApiApp } from "../../../api/src";

type ApiOptions = {
  param?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  json?: unknown;
  form?: Record<string, unknown>;
};

const routeAliases: Record<string, string> = {
  accounts: "asset",
  transactions: "transaction",
  institutions: "institution",
  "provider-connections": "provider-connection",
  "institution-connections": "institution-connection",
  providers: "provider",
  rates: "rate",
  currencies: "currency",
  countries: "country",
};

const unsupportedRoots = new Set(["connections", "subscription", "documents"]);
let edenApi: ReturnType<typeof treaty<ApiApp>>["api"] | null = null;

function getEdenApi() {
  if (!edenApi) edenApi = treaty<ApiApp>(env.NEXT_PUBLIC_API_URL).api;
  return edenApi;
}

async function request(
  method: string,
  segments: string[],
  options?: ApiOptions,
): Promise<Response> {
  const root = segments[0];
  if (root && unsupportedRoots.has(root)) {
    return new Response(
      JSON.stringify({
        error: `${root} is not available in the MVP backend yet.`,
      }),
      { status: 501, headers: { "content-type": "application/json" } },
    );
  }

  let cursor: unknown = getEdenApi();
  for (const segment of segments) {
    if (segment.startsWith(":")) {
      const key = segment.slice(1);
      const value = options?.param?.[key];
      if (!value) {
        return new Response(
          JSON.stringify({ error: `Missing route parameter: ${key}` }),
          { status: 400, headers: { "content-type": "application/json" } },
        );
      }
      cursor = (cursor as (params: Record<string, string>) => unknown)({
        [key]: value,
      });
      continue;
    }

    const alias = routeAliases[segment] ?? segment;
    cursor = (cursor as Record<string, unknown>)[alias];
  }

  const requestOptions = {
    query: options?.query,
    fetch: {
      credentials: "include",
    } satisfies RequestInit,
  };

  const call = (() => {
    if (method === "GET")
      return (cursor as { get: (opts: unknown) => Promise<unknown> }).get(
        requestOptions,
      );
    if (method === "DELETE")
      return (
        cursor as {
          delete: (body: unknown, opts: unknown) => Promise<unknown>;
        }
      ).delete(options?.json ?? null, requestOptions);
    if (method === "POST")
      return (
        cursor as {
          post: (body: unknown, opts: unknown) => Promise<unknown>;
        }
      ).post(options?.form ?? options?.json ?? null, requestOptions);
    if (method === "PUT")
      return (
        cursor as {
          put: (body: unknown, opts: unknown) => Promise<unknown>;
        }
      ).put(options?.json ?? null, requestOptions);
    return (
      cursor as {
        patch: (body: unknown, opts: unknown) => Promise<unknown>;
      }
    ).patch(options?.json ?? null, requestOptions);
  })();

  const result = (await call) as {
    data: unknown;
    error: {
      value?: { error?: string; message?: string };
      status?: number;
    } | null;
  };

  if (result.error) {
    const errorPayload = result.error.value as
      | { error?: string; message?: string }
      | undefined;
    const message =
      errorPayload?.error || errorPayload?.message || "Request failed";
    return new Response(JSON.stringify({ error: message }), {
      status: result.error.status ?? 500,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify(result.data), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function createPathProxy(segments: string[]): unknown {
  return new Proxy(
    {},
    {
      get(_target, property: string) {
        if (property === "$get")
          return (options?: ApiOptions) => request("GET", segments, options);
        if (property === "$post")
          return (options?: ApiOptions) => request("POST", segments, options);
        if (property === "$put")
          return (options?: ApiOptions) => request("PUT", segments, options);
        if (property === "$patch")
          return (options?: ApiOptions) => request("PATCH", segments, options);
        if (property === "$delete")
          return (options?: ApiOptions) => request("DELETE", segments, options);

        return createPathProxy([...segments, property]);
      },
    },
  );
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic proxy exposes RPC-like client paths.
export async function getApiClient(): Promise<any> {
  // biome-ignore lint/suspicious/noExplicitAny: dynamic proxy exposes RPC-like client paths.
  return createPathProxy([]) as any;
}
