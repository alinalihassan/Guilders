"use client";

import type { Account } from "@guilders/api/types";
import { Check, ChevronsUpDown } from "lucide-react";
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

  const selectedAccount = accountOptions.find((a) => a.id === value);

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
          <span className="truncate">
            {selectedAccount
              ? `${selectedAccount.name}${isTracked(selectedAccount) ? " (Connected)" : ""}`
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search accounts..."
            disabled={disabled}
          />
          <CommandList>
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
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === account.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {account.name}
                      {tracked && " (Connected)"}
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
