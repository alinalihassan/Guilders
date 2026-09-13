import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Loader2, XCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useConnectApiKey, useDeregisterConnection } from "@/lib/queries/useConnections";
import { useProviderConnections } from "@/lib/queries/useProviderConnections";
import { useProviders } from "@/lib/queries/useProviders";

export const Route = createFileRoute("/(pages)/(protected)/settings/connections/")({
  component: ConnectionsPage,
});

function ConnectionsPage() {
  const { data: connections, isLoading, isError, refetch } = useProviderConnections();
  const { mutate: deregisterConnection } = useDeregisterConnection();
  const { data: providers, isLoading: isProvidersLoading } = useProviders();
  const [deregisteringId, setDeregisteringId] = useState<number | null>(null);
  const [removedIds, setRemovedIds] = useState<number[]>([]);

  const visibleConnections = connections?.filter(
    (connection) => !removedIds.includes(connection.provider_id),
  );
  const providersById = new Map(providers?.map((provider) => [provider.id, provider]));
  const lunchFlowProvider = providers?.find((provider) => provider.name === "LunchFlow");
  const lunchFlowConnection = visibleConnections?.find(
    (connection) => connection.provider_id === lunchFlowProvider?.id,
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Connections</h3>
        <p className="text-muted-foreground text-sm">
          Manage linked providers and import accounts from Lunch Flow.
        </p>
      </div>
      <Separator />
      {isLoading || isProvidersLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-24" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
                <Skeleton className="h-9 w-[77px]" />
              </div>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="bg-destructive/10 rounded-full p-3">
              <XCircle className="text-destructive h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Failed to load connections</h4>
              <p className="text-muted-foreground text-sm">
                There was an error loading your connections. Please try again later.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {visibleConnections?.map((connection) => {
            const provider = providersById.get(connection.provider_id);
            const providerName = provider?.name ?? "Provider";
            const providerLogo = provider?.logo_url;

            return (
              <Card key={connection.provider_id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-8 w-24">
                      {providerLogo ? (
                        <img
                          src={providerLogo}
                          alt={`${providerName} logo`}
                          className="h-full w-full object-contain"
                        />
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <div className="font-medium">{providerName}</div>
                      <div className="text-muted-foreground text-sm">
                        Connected on {format(new Date(connection.created_at), "PPP")}
                      </div>
                    </div>
                  </div>
                  {deregisteringId === connection.provider_id ? (
                    <Button variant="destructive" disabled>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Removing...
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setDeregisteringId(connection.provider_id);
                        deregisterConnection(connection.provider_id.toString(), {
                          onSuccess: () => {
                            setRemovedIds((prev) => [...prev, connection.provider_id]);
                            setDeregisteringId(null);
                            refetch();
                          },
                          onError: () => {
                            setDeregisteringId(null);
                          },
                        });
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
          {lunchFlowProvider && !lunchFlowConnection ? (
            <LunchFlowConnectCard
              providerId={lunchFlowProvider.id}
              providerLogo={lunchFlowProvider.logo_url}
            />
          ) : null}
          {!lunchFlowProvider && (visibleConnections?.length ?? 0) === 0 ? (
            <div>No connections found</div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function LunchFlowConnectCard({
  providerId,
  providerLogo,
}: {
  providerId: number;
  providerLogo: string;
}) {
  const [apiKey, setApiKey] = useState("");
  const connectApiKey = useConnectApiKey();

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="relative h-8 w-24 shrink-0">
            <img
              src={providerLogo}
              alt="Lunch Flow logo"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="space-y-1">
            <div className="font-medium">Lunch Flow</div>
            <p className="text-muted-foreground text-sm">
              Paste your personal API key to import the bank accounts already connected in Lunch
              Flow. Create a key in your{" "}
              <a
                href="https://lunchflow.app/destinations"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                Lunch Flow destinations
              </a>
              .
            </p>
          </div>
        </div>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = apiKey.trim();
            if (!trimmed || connectApiKey.isPending) return;
            connectApiKey.mutate({
              providerId: providerId.toString(),
              apiKey: trimmed,
            });
          }}
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="lunchflow-api-key">API key</Label>
            <Input
              id="lunchflow-api-key"
              type="password"
              autoComplete="off"
              placeholder="Lunch Flow API key"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={!apiKey.trim() || connectApiKey.isPending}>
            {connectApiKey.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect"
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
}
