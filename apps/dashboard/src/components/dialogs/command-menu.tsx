import type { Institution } from "@guilders/api/types";
import { useRouter } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CommandLoading } from "cmdk";
import { Banknote, Landmark, Link2, SquarePen } from "lucide-react";
import { useRef, useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useDialog } from "@/hooks/useDialog";
import { bottomNavigation, mainNavigation } from "@/lib/config/navigation";
import { useCountriesMap } from "@/lib/queries/useCountries";
import { useInstitutions } from "@/lib/queries/useInstitutions";
import { useProviders } from "@/lib/queries/useProviders";

export function CommandMenu() {
  const { isOpen, data, close, update } = useDialog("command");
  const { open: openManualAccount } = useDialog("addManualAccount");
  const { open: openAddTransaction } = useDialog("addTransaction");
  const { open: openLinkedAccount } = useDialog("addLinkedAccount");
  const { data: institutions, isLoading } = useInstitutions();
  const { data: providers } = useProviders();
  const countriesMap = useCountriesMap();
  const [search, setSearch] = useState("");
  const [value, setValue] = useState("");
  const router = useRouter();

  const pages = data?.pages ?? [];

  const handleAddAccount = () => {
    close();
    setTimeout(() => {
      setSearch("");
      openManualAccount();
    }, 40);
  };

  const handleAddTransaction = () => {
    close();
    setTimeout(() => {
      setSearch("");
      openAddTransaction({});
    }, 40);
  };

  const handleAddLinkedAccount = (institution: Institution) => {
    close();
    setTimeout(() => {
      setSearch("");
      openLinkedAccount({ institution });
    }, 40);
  };

  const handleNavigate = (path: string) => {
    close();
    setSearch("");
    router.navigate({ to: path });
  };

  const changePage = (newPage: string) => {
    update({
      pages: [...pages, newPage],
    });
  };

  const currentPage = pages[pages.length - 1];

  const parentRef = useRef<HTMLDivElement>(null);
  const keyboardNavRef = useRef(false);
  const pointerLockTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [pointerLocked, setPointerLocked] = useState(false);

  const allInstitutions = institutions ?? [];
  const filteredInstitutions = allInstitutions.filter((institution) => {
    if (!search) return true;
    const searchTerms = search.toLowerCase().trim().split(/\s+/);
    const countryName = institution.country
      ? countriesMap?.[institution.country] || "Global"
      : "Global";
    return searchTerms.every(
      (term) =>
        institution.name.toLowerCase().includes(term) || countryName.toLowerCase().includes(term),
    );
  });

  const virtualizer = useVirtualizer({
    count: filteredInstitutions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 8,
  });

  const lockPointerSelection = () => {
    if (!pointerLocked) setPointerLocked(true);
    clearTimeout(pointerLockTimerRef.current);
    pointerLockTimerRef.current = setTimeout(() => setPointerLocked(false), 150);
  };

  const handleValueChange = (next: string) => {
    setValue(next);
    if (!keyboardNavRef.current) return;
    keyboardNavRef.current = false;
    const idx = filteredInstitutions.findIndex((institution) => institution.id.toString() === next);
    if (idx >= 0) {
      virtualizer.scrollToIndex(idx, { align: "auto" });
    }
  };

  const handleOpenChange = (_open: boolean) => {
    if (!_open) {
      close();
      setSearch("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Home" || e.key === "End") {
      keyboardNavRef.current = true;
    }

    // Handle backspace when search is empty
    if (e.key === "Backspace" && !search) {
      e.preventDefault();
      if (pages.length > 0) {
        update({
          pages: pages.slice(0, -1),
        });
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setSearch("");
      close();
    }
  };

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={handleOpenChange}
      commandProps={{
        onKeyDown: handleKeyDown,
        shouldFilter: currentPage !== "add-synced-account",
        disablePointerSelection: currentPage === "add-synced-account" && pointerLocked,
        ...(currentPage === "add-synced-account" && { value, onValueChange: handleValueChange }),
      }}
    >
      <CommandInput
        value={search}
        onValueChange={setSearch}
        placeholder="Type a command or search..."
      />
      <CommandList
        ref={parentRef}
        onScroll={currentPage === "add-synced-account" ? lockPointerSelection : undefined}
      >
        <CommandEmpty>No results found.</CommandEmpty>
        {!currentPage && (
          <>
            <CommandGroup heading="Manage Data">
              <CommandItem onSelect={() => changePage("add-account")}>
                <Landmark className="mr-2 h-4 w-4" />
                Add Account
              </CommandItem>
              <CommandItem onSelect={handleAddTransaction}>
                <Banknote className="mr-2 h-4 w-4" />
                Add Transaction
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Navigation">
              {[...mainNavigation, ...bottomNavigation]
                .filter((item) => item.href)
                .map((item) => (
                  <CommandItem key={item.name} onSelect={() => handleNavigate(item.href ?? "")}>
                    {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                    Go to {item.name}
                  </CommandItem>
                ))}
            </CommandGroup>
          </>
        )}
        {currentPage === "add-account" && (
          <CommandGroup>
            <CommandItem onSelect={handleAddAccount}>
              <SquarePen className="mr-2 h-4 w-4" />
              Add Manual Account
            </CommandItem>
            <CommandItem onSelect={() => changePage("add-synced-account")}>
              <Link2 className="mr-2 h-4 w-4" />
              Add Synced Account
            </CommandItem>
          </CommandGroup>
        )}
        {currentPage === "add-synced-account" && (
          <>
            {isLoading && <CommandLoading>Loading institutions...</CommandLoading>}
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const institution = filteredInstitutions[virtualItem.index];
                if (!institution) return null;

                return (
                  <CommandItem
                    key={institution.id}
                    ref={virtualizer.measureElement}
                    data-index={virtualItem.index}
                    value={institution.id.toString()}
                    onSelect={() => handleAddLinkedAccount(institution)}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={institution.logo_url}
                        alt={`${institution.name} logo`}
                        width={24}
                        height={24}
                        className="rounded-sm"
                      />
                      <div className="flex flex-col justify-center">
                        <span className="text-md">{institution.name}</span>
                        <span className="text-muted-foreground text-xs leading-3">
                          {institution.country
                            ? countriesMap?.[institution.country] || "Global"
                            : "Global"}{" "}
                          •{" "}
                          {providers?.find((p) => p.id === institution.provider_id)?.name ??
                            "Unknown Provider"}
                        </span>
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </div>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
