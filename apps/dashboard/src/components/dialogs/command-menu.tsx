import { useRouter } from "@tanstack/react-router";
import { Banknote, Landmark } from "lucide-react";
import { useState } from "react";

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

export function CommandMenu() {
  const { isOpen, close } = useDialog("command");
  const { open: openAddAccount } = useDialog("addAccount");
  const { open: openAddTransaction } = useDialog("addTransaction");
  const [search, setSearch] = useState("");
  const router = useRouter();

  const handleAddAccount = () => {
    close();
    setTimeout(() => {
      setSearch("");
      openAddAccount();
    }, 40);
  };

  const handleAddTransaction = () => {
    close();
    setTimeout(() => {
      setSearch("");
      openAddTransaction({});
    }, 40);
  };

  const handleNavigate = (path: string) => {
    close();
    setSearch("");
    router.navigate({ to: path });
  };

  const handleOpenChange = (_open: boolean) => {
    if (!_open) {
      close();
      setSearch("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
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
      }}
    >
      <CommandInput
        value={search}
        onValueChange={setSearch}
        placeholder="Type a command or search..."
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Manage Data">
          <CommandItem onSelect={handleAddAccount}>
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
      </CommandList>
    </CommandDialog>
  );
}
