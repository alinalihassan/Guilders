import type { Account } from "@guilders/api/types";
import type { InstitutionConnection } from "@guilders/api/types";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Loader2, Unlink, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { AccountIcon } from "@/components/dashboard/accounts/account-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { accountSubtypeLabels, type AccountSubtype } from "@/lib/account-types";
import { useAccounts } from "@/lib/queries/useAccounts";
import { useDeregisterConnection } from "@/lib/queries/useConnections";
import { useInstitutionConnections } from "@/lib/queries/useInstitutionConnection";
import { useProviderConnections } from "@/lib/queries/useProviderConnections";
import { useProviders } from "@/lib/queries/useProviders";

export const Route = createFileRoute("/(pages)/(protected)/settings/connections/")({
  component: ConnectionsPage,
});

/** Top-level accounts only (no parent), for a given institution connection */
function accountsForInstitution(
  accounts: Account[] | undefined,
  institutionConnectionId: number,
): Account[] {
  if (!accounts) return [];
  return accounts.filter(
    (acc) =>
      acc.institution_connection_id === institutionConnectionId &&
      (acc.parent == null || acc.parent === undefined),
  );
}

function ConnectionAccountsList({
  accounts,
  imageErrors,
  onImageError,
}: {
  accounts: Account[];
  imageErrors: Set<number>;
  onImageError: (accountId: number) => void;
}) {
  if (accounts.length === 0) {
    return <p className="text-sm text-muted-foreground">No linked accounts</p>;
  }
  return (
    <ul className="space-y-2">
      {accounts.map((account) => (
        <li key={account.id}>
          <Link
            to="/accounts/$id"
            params={{ id: String(account.id) }}
            className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted"
          >
            <AccountIcon
              account={account}
              width={32}
              height={32}
              hasImageError={imageErrors.has(account.id)}
              onImageError={onImageError}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{account.name}</p>
              <p className="text-sm text-muted-foreground">
                {accountSubtypeLabels[(account.subtype ?? "depository") as AccountSubtype]}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ConnectionsPage() {
  const { data: connections, isLoading, isError, refetch } = useProviderConnections();
  const { data: institutionConnections, isLoading: isInstConnLoading } =
    useInstitutionConnections();
  const { data: accounts, isLoading: isAccountsLoading } = useAccounts();
  const { mutate: deregisterConnection } = useDeregisterConnection();
  const { data: providers, isLoading: isProvidersLoading } = useProviders();
  const [deregisteringId, setDeregisteringId] = useState<number | null>(null);
  const [removedIds, setRemovedIds] = useState<number[]>([]);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  /** For each provider connection id, list of institution connections under it */
  const institutionConnectionsByProviderConnectionId = useMemo(() => {
    const map = new Map<number, InstitutionConnection[]>();
    if (!institutionConnections) return map;
    for (const ic of institutionConnections) {
      const pid = ic.provider_connection_id;
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid)!.push(ic);
    }
    return map;
  }, [institutionConnections]);

  const handleImageError = (accountId: number) => {
    setImageErrors((prev) => new Set(prev).add(accountId));
  };

  const loading = isLoading || isProvidersLoading || isAccountsLoading || isInstConnLoading;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Connections</h3>
        <p className="text-sm text-muted-foreground">
          Manage your connections by provider and institution. You can disconnect a single
          institution or remove the entire provider connection.
        </p>
      </div>
      <Separator />
      {loading ? (
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
              <Separator className="my-4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
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
              const instConns =
                institutionConnectionsByProviderConnectionId.get(connection.id) ?? [];

              return (
                <Card key={connection.id} className="p-4">
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
                        Remove provider
                      </Button>
                    )}
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-4">
                    {instConns.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No institution connections yet.
                      </p>
                    ) : (
                      instConns.map((ic) => {
                        const linkedAccounts = accountsForInstitution(accounts, ic.id);
                        const institutionName = ic.institution?.name ?? "Institution";
                        const institutionLogo = ic.institution?.logo_url;

                        return (
                          <div
                            key={ic.id}
                            className="rounded-lg border border-border bg-muted/30 p-3"
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {institutionLogo ? (
                                  <img
                                    src={institutionLogo}
                                    alt=""
                                    className="h-6 w-6 rounded object-contain"
                                  />
                                ) : null}
                                <span className="font-medium">{institutionName}</span>
                                {ic.broken && (
                                  <span className="text-xs text-amber-600 dark:text-amber-400">
                                    (needs reconnection)
                                  </span>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-destructive"
                                title="Disconnect this institution (coming soon)"
                                disabled
                              >
                                <Unlink className="mr-1.5 h-4 w-4" />
                                Disconnect
                              </Button>
                            </div>
                            <ConnectionAccountsList
                              accounts={linkedAccounts}
                              imageErrors={imageErrors}
                              onImageError={handleImageError}
                            />
                          </div>
                        );
                      })
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
