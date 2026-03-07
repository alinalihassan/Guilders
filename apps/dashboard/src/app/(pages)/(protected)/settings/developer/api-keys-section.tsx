import { Check, Copy, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateApiKey, useDeleteApiKey, useApiKeys } from "@/lib/queries/useApiKeys";

export function ApiKeysSection() {
  const [copying, setCopying] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: keys = [], isLoading } = useApiKeys();
  const createApiKey = useCreateApiKey();
  const deleteApiKey = useDeleteApiKey();

  const hasApiKeys = keys.length > 0;

  const handleCopy = async () => {
    if (!generatedKey) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(generatedKey);
      toast.success("API key copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
    setTimeout(() => setCopying(false), 1000);
  };

  const handleGenerate = async () => {
    try {
      const result = await createApiKey.mutateAsync({});
      setGeneratedKey(result.key);
      toast.success("API Key generated", {
        description: "Your API key has been generated successfully.",
      });
    } catch {
      // Error already surfaced by hook
    }
  };

  const handleDelete = async (keyId: string) => {
    setDeletingId(keyId);
    try {
      await deleteApiKey.mutateAsync(keyId);
      toast.success("API key revoked");
    } catch {
      // Error already surfaced by hook
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Button onClick={handleGenerate} disabled={createApiKey.isPending}>
        {createApiKey.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          "Generate API Key"
        )}
      </Button>

      {generatedKey && (
        <div className="space-y-2 rounded-lg border border-amber-500/50 bg-amber-500/5 p-4">
          <p className="text-sm font-medium">New API Key (shown once)</p>
          <div className="flex gap-2">
            <Input readOnly value={generatedKey} className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={handleCopy} disabled={copying}>
              {copying ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
            </div>
          ))}
        </div>
      ) : !hasApiKeys ? (
        <p className="text-sm text-muted-foreground">No API keys created yet.</p>
      ) : (
        <div className="space-y-4">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between gap-3 rounded-md border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{key.name || "API key"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {key.prefix || "key"}-{key.start || key.id.slice(0, 8)}...
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(key.id)}
                disabled={deletingId === key.id}
              >
                {deletingId === key.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
