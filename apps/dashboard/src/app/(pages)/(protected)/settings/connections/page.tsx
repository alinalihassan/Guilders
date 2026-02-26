"use client";

import { format } from "date-fns";
import { Loader2, XCircle } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeregisterConnection } from "@/lib/queries/useConnections";
import { useProviderConnections } from "@/lib/queries/useProviderConnections";
import { useProviders } from "@/lib/queries/useProviders";

export default function ConnectionsPage() {
  const { data: connections, isLoading, isError, refetch } = useProviderConnections();
  const { mutate: deregisterConnection } = useDeregisterConnection();
  const { data: providers, isLoading: isProvidersLoading } = useProviders();
  const [deregisteringId, setDeregisteringId] = useState<number | null>(null);
  const [removedIds, setRemovedIds] = useState<number[]>([]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Connections</h3>
        <p className="text-sm text-muted-foreground">Manage your connections.</p>
      </div>
      <Separator />
      {isLoading || isProvidersLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-8 w-24" />
                  <div>
                    <Skeleton className="mb-2 h-5 w-32" />
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
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Failed to load connections</h4>
              <p className="text-sm text-muted-foreground">
                There was an error loading your connections. Please try again later.
              </p>
            </div>
          </div>
        </Card>
      ) : connections && connections.length === 0 ? (
        <div>No connections found</div>
      ) : (
        <div className="space-y-4">
          {connections
            ?.filter((connection) => !removedIds.includes(connection.provider_id))
            .map((connection) => {
              const provider = providers?.find((item) => item.id === connection.provider_id);
              const providerName = provider?.name ?? "Provider";
              const providerLogo = provider?.logo_url;

              return (
                <Card key={connection.provider_id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="relative h-8 w-24">
                        {providerLogo ? (
                          <Image
                            src={providerLogo}
                            alt={`${providerName} logo`}
                            fill
                            className="object-contain"
                          />
                        ) : null}
                      </div>
                      <div>
                        <div className="font-medium">{providerName}</div>
                        <div className="text-sm text-muted-foreground">
                          Connected {format(new Date(connection.created_at), "PPP")}
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
        </div>
      )}
    </div>
  );
}
