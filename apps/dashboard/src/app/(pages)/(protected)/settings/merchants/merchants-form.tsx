import type { Merchant } from "@guilders/api/types";
import { Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAddMerchant,
  useMerchants,
  useRemoveMerchant,
  useUpdateMerchant,
} from "@/lib/queries/useMerchants";
import { cn } from "@/lib/utils";

export function MerchantsForm() {
  const { data: merchants, isLoading } = useMerchants();
  const { mutate: addMerchant, isPending: isAdding } = useAddMerchant();

  const [newMerchantName, setNewMerchantName] = useState("");

  const handleAddMerchant = () => {
    const trimmed = newMerchantName.trim();
    if (!trimmed) return;
    addMerchant(
      { name: trimmed },
      {
        onSuccess: () => {
          setNewMerchantName("");
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3 rounded-lg border border-border/60 px-3 py-2.5">
          <Skeleton className="h-8 w-44" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 rounded-lg border border-border/60 px-4 py-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
          <Input
            value={newMerchantName}
            onChange={(e) => setNewMerchantName(e.target.value)}
            placeholder="e.g. Amazon"
            className="w-64"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddMerchant();
              }
            }}
          />
          <Button onClick={handleAddMerchant} disabled={isAdding || !newMerchantName.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>

        <div className="space-y-1 pt-4">
          {merchants?.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              No merchants found.
            </div>
          ) : (
            merchants?.map((merchant) => <MerchantRow key={merchant.id} merchant={merchant} />)
          )}
        </div>
      </div>
    </div>
  );
}

function MerchantRow({ merchant }: { merchant: Merchant }) {
  const { mutate: updateMerchant } = useUpdateMerchant();
  const { mutate: removeMerchant, isPending: isRemoving } = useRemoveMerchant();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(merchant.name);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const saveName = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== merchant.name) {
      updateMerchant({ id: merchant.id, merchant: { name: trimmed } });
    } else {
      setNameDraft(merchant.name);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveName();
    }
    if (e.key === "Escape") {
      setNameDraft(merchant.name);
      setIsEditingName(false);
      inputRef.current?.blur();
    }
  };

  const initial = merchant.name.charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        "flex flex-1 items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
        "border-border/60 bg-card hover:bg-muted/30",
      )}
    >
      <div className="shrink-0">
        {merchant.logo_url ? (
          <img
            src={merchant.logo_url}
            alt={merchant.name}
            className="flex size-8 items-center justify-center rounded-full object-cover border bg-muted"
          />
        ) : (
          <div className="flex size-8 items-center justify-center rounded-full border bg-muted text-muted-foreground font-medium">
            {initial}
          </div>
        )}
      </div>

      {isEditingName ? (
        <Input
          ref={inputRef}
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={saveName}
          onKeyDown={handleNameKeyDown}
          className="ml-[-3px] h-7 min-w-[8rem] max-w-[14rem] shrink-0 pl-0.5 text-sm font-medium"
          autoFocus
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setNameDraft(merchant.name);
            setIsEditingName(true);
          }}
          className="min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground hover:underline"
        >
          {merchant.name}
        </button>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              disabled={isRemoving}
              aria-label={`Delete merchant ${merchant.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete merchant</AlertDialogTitle>
              <AlertDialogDescription>
                Delete “{merchant.name}”? This cannot be undone. Transactions using this merchant
                will lose their merchant association.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => removeMerchant(merchant.id)}
                disabled={isRemoving}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isRemoving ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
