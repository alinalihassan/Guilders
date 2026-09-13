import type { Account } from "@guilders/api/types";
import { ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { inputTriggerStyles } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAccounts } from "@/lib/queries/useAccounts";
import { cn } from "@/lib/utils";

import { AccountIcon } from "../dashboard/accounts/account-icon";

type AccountSelectorProps = {
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** When true, hide connected/synced accounts (only show manual accounts). Default false. */
  hideTrackedAccounts?: boolean;
};

function isTracked(account: Account): boolean {
  return !!account.institution_connection_id;
}

function SelectorAccountIcon({ account }: { account: Account }) {
  const [hasImageError, setHasImageError] = useState(false);
  return (
    <AccountIcon
      account={account}
      width={24}
      height={24}
      hasImageError={hasImageError}
      onImageError={() => setHasImageError(true)}
    />
  );
}

export function AccountSelector({
  value,
  onChange,
  disabled,
  placeholder = "Select account",
  className,
  hideTrackedAccounts = false,
}: AccountSelectorProps) {
  const { data: accounts, isLoading } = useAccounts();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const accountOptions = useMemo(() => {
    let list = accounts ?? [];
    if (hideTrackedAccounts) {
      list = list.filter((a) => !isTracked(a));
    }
    return list.toSorted((a, b) => a.name.localeCompare(b.name));
  }, [accounts, hideTrackedAccounts]);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accountOptions;
    return accountOptions.filter((a) => a.name.toLowerCase().includes(q));
  }, [accountOptions, search]);

  const selectedAccount = useMemo(() => {
    if (accounts == null || value == null) return undefined;
    return accounts.find((a) => a.id === value);
  }, [accounts, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            inputTriggerStyles,
            "font-normal hover:bg-card hover:text-foreground",
            className,
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
            {selectedAccount && (
              <span className="shrink-0">
                <SelectorAccountIcon account={selectedAccount} />
              </span>
            )}
            <span className="truncate">{selectedAccount?.name || placeholder}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="max-h-[min(400px,80vh)] w-(--radix-popover-trigger-width) p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search accounts..."
            disabled={disabled}
          />
          <CommandList className="max-h-[300px] overflow-x-hidden overflow-y-auto">
            <CommandEmpty className="p-2">No accounts found.</CommandEmpty>
            <CommandGroup>
              {isLoading ? (
                <CommandItem disabled>Loading accounts...</CommandItem>
              ) : (
                filteredOptions.map((account) => {
                  const tracked = isTracked(account);
                  const isDisabled = tracked && value !== undefined && account.id !== value;
                  return (
                    <CommandItem
                      key={account.id}
                      value={`${account.id}-${account.name}`}
                      onSelect={() => {
                        if (isDisabled) return;
                        onChange(account.id);
                        setOpen(false);
                        setSearch("");
                      }}
                      disabled={isDisabled}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span className="shrink-0">
                          <SelectorAccountIcon account={account} />
                        </span>
                        <span className="truncate">{account.name}</span>
                      </span>
                    </CommandItem>
                  );
                })
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
