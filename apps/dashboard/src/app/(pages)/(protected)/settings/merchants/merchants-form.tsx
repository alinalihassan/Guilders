import type { Merchant } from "@guilders/api/types";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
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
import { useFiles } from "@/lib/queries/useFiles";
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
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5"
              >
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))
          ) : merchants?.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
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
  const { uploadFile, isUploading, getFileUrl, documents, deleteFile } = useFiles({
    entityType: "merchant",
    entityId: merchant.id,
    onSuccess: (file) => {
      // Once uploaded, update the merchant's logo_url to point to this new document
      updateMerchant({
        id: merchant.id,
        merchant: { name: merchant.name, logo_url: getFileUrl(file.id) },
      });
    },
  });

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // If there's already a logo document, we should probably delete it first to save space
    if (documents.length > 0) {
      for (const doc of documents) {
        await deleteFile(doc.id);
      }
    }

    await uploadFile([file]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
      <div 
        className="shrink-0 relative group cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/jpeg,image/png,image/webp,image/heic"
          onChange={handleFileChange}
        />
        {isUploading ? (
          <div className="flex size-8 items-center justify-center rounded-full border bg-muted">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : merchant.logo_url ? (
          <>
            <img
              src={merchant.logo_url}
              alt={merchant.name}
              className="flex size-8 items-center justify-center rounded-full border bg-muted object-cover transition-opacity group-hover:opacity-50"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Upload className="size-3.5 text-foreground drop-shadow-md" />
            </div>
          </>
        ) : (
          <>
            <div className="flex size-8 items-center justify-center rounded-full border bg-muted font-medium text-muted-foreground transition-opacity group-hover:opacity-50">
              {initial}
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Upload className="size-3.5 text-foreground" />
            </div>
          </>
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
