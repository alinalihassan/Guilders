import type { Merchant } from "@guilders/api/types";
import { ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { useState } from "react";

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
import { useAddMerchant, useMerchants } from "@/lib/queries/useMerchants";
import { cn } from "@/lib/utils";

type MerchantSelectorProps = {
  value?: number;
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

function MerchantIcon({ merchant, className }: { merchant: Merchant; className?: string }) {
  const initial = merchant.name.charAt(0).toUpperCase();

  if (merchant.logo_url) {
    return (
      <img
        src={merchant.logo_url}
        alt={merchant.name}
        className={cn(
          "flex size-6 items-center justify-center rounded-full border bg-muted object-cover",
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex size-6 items-center justify-center rounded-full border bg-muted text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      {initial}
    </div>
  );
}

export function MerchantSelector({
  value,
  onChange,
  disabled,
  placeholder = "Select merchant",
  className,
}: MerchantSelectorProps) {
  const { data: merchants, isLoading } = useMerchants();
  const { mutate: addMerchant, isPending: isCreating } = useAddMerchant();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedMerchant = value != null ? merchants?.find((m) => m.id === value) : undefined;

  const trimmedSearch = search.trim();
  const canCreate =
    trimmedSearch.length > 0 &&
    !merchants?.some((m) => m.name.toLowerCase() === trimmedSearch.toLowerCase());

  const handleCreateMerchant = () => {
    if (!trimmedSearch) return;
    addMerchant(
      { name: trimmedSearch },
      {
        onSuccess: (createdMerchant) => {
          onChange(createdMerchant.id);
          setSearch("");
          setOpen(false);
        },
      },
    );
  };

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
            {selectedMerchant && <MerchantIcon merchant={selectedMerchant} className="shrink-0" />}
            <span className="truncate">{selectedMerchant?.name || placeholder}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) max-h-[min(400px,80vh)] p-0"
        align="start"
      >
        <Command shouldFilter>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search merchants..."
            disabled={disabled || isCreating}
          />
          <CommandList className="max-h-[300px] overflow-y-auto overflow-x-hidden">
            <CommandEmpty className="p-2">
              {canCreate ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleCreateMerchant}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Add "{trimmedSearch}"
                </Button>
              ) : (
                "No merchants found."
              )}
            </CommandEmpty>
            <CommandGroup>
              {isLoading ? (
                <CommandItem disabled>Loading merchants...</CommandItem>
              ) : (
                merchants?.map((merchant) => (
                  <CommandItem
                    key={merchant.id}
                    value={merchant.name}
                    onSelect={() => {
                      onChange(merchant.id);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <MerchantIcon merchant={merchant} className="shrink-0" />
                      <span className="truncate">{merchant.name}</span>
                    </span>
                  </CommandItem>
                ))
              )}
              {canCreate && (
                <CommandItem value={`add-${trimmedSearch}`} onSelect={handleCreateMerchant}>
                  {isCreating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Add "{trimmedSearch}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
