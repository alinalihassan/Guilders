import type { Institution } from "@guilders/api/types";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDialog } from "@/hooks/useDialog";
import { countryCodeToFlag } from "@/lib/country-flag";
import { useCountries } from "@/lib/queries/useCountries";
import { useGeo } from "@/lib/queries/useGeo";
import { useInstitutions } from "@/lib/queries/useInstitutions";
import { useUser } from "@/lib/queries/useUser";

function InstitutionRow({
  institution,
  subtitle,
  onConnect,
}: {
  institution: Institution;
  subtitle: string;
  onConnect: (institution: Institution) => void;
}) {
  return (
    <div className="border-border/60 flex items-center gap-3 rounded-lg border px-3 py-2.5">
      <img
        src={institution.logo_url}
        alt={`${institution.name} logo`}
        width={32}
        height={32}
        className="bg-muted size-8 shrink-0 rounded-sm object-contain"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{institution.name}</p>
        <p className="text-muted-foreground truncate text-xs">{subtitle}</p>
      </div>
      <Button type="button" size="sm" variant="secondary" onClick={() => onConnect(institution)}>
        Connect
      </Button>
    </div>
  );
}

export function ConnectBankDialog() {
  const { isOpen, close } = useDialog("connectBank");
  const { open: openLinkedAccount } = useDialog("addLinkedAccount");
  const { data: user } = useUser();
  const { data: geo } = useGeo();
  const { data: countries } = useCountries();
  const { data: institutions, isLoading } = useInstitutions();

  const [selectedCountry, setSelectedCountry] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      return;
    }
    const preferred = user?.country || geo?.country || "";
    if (preferred) setSelectedCountry(preferred);
  }, [isOpen, user?.country, geo?.country]);

  const countriesMap = Object.fromEntries((countries ?? []).map((c) => [c.code, c.name]));
  const countryName = selectedCountry
    ? (countriesMap[selectedCountry] ?? selectedCountry)
    : "Select country";

  const searchTerms = search.toLowerCase().trim().split(/\s+/).filter(Boolean);

  const matchesSearch = (institution: Institution) => {
    if (searchTerms.length === 0) return true;
    return searchTerms.every((term) => institution.name.toLowerCase().includes(term));
  };

  const bankInstitutions = (institutions ?? [])
    .filter((i) => i.country === selectedCountry)
    .filter(matchesSearch)
    .toSorted((a, b) => a.name.localeCompare(b.name));

  const investmentInstitutions = (institutions ?? [])
    .filter((i) => i.country == null)
    .filter(matchesSearch)
    .toSorted((a, b) => a.name.localeCompare(b.name));

  const handleConnect = (institution: Institution) => {
    close();
    setTimeout(() => openLinkedAccount({ institution }), 40);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[520px]">
        <DialogHeader className="space-y-3 border-b px-6 py-4">
          <DialogTitle>Connect a bank</DialogTitle>
          <DialogDescription>
            Choose your country and connect to a supported institution.
          </DialogDescription>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={selectedCountry || undefined} onValueChange={setSelectedCountry}>
              <SelectTrigger className="sm:w-[220px]">
                <SelectValue placeholder="Country">
                  {selectedCountry ? (
                    <span className="flex items-center gap-2">
                      <span aria-hidden>{countryCodeToFlag(selectedCountry)}</span>
                      <span>{countryName}</span>
                    </span>
                  ) : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(countries ?? [])
                  .toSorted((a, b) => a.name.localeCompare(b.name))
                  .map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      <span className="flex items-center gap-2">
                        <span aria-hidden>{countryCodeToFlag(country.code)}</span>
                        <span>{country.name}</span>
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search institutions..."
                className="pl-9"
              />
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
          <section className="space-y-2">
            <h3 className="text-sm font-medium">Banks</h3>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : !selectedCountry ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                Select a country to see banks.
              </p>
            ) : bankInstitutions.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                No banks found for {countryName}.
              </p>
            ) : (
              <div className="space-y-2">
                {bankInstitutions.map((institution) => (
                  <InstitutionRow
                    key={institution.id}
                    institution={institution}
                    subtitle={`${countryName} · Open banking`}
                    onConnect={handleConnect}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-medium">Investments</h3>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : investmentInstitutions.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                No investment institutions found.
              </p>
            ) : (
              <div className="space-y-2">
                {investmentInstitutions.map((institution) => (
                  <InstitutionRow
                    key={institution.id}
                    institution={institution}
                    subtitle="Brokerage"
                    onConnect={handleConnect}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
