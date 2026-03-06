"use client";

import { Check, Copy, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  if (isLoading) {
    return <div className="flex justify-center py-6">Loading...</div>;
  }

  return (
    <div className="space-y-4">
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
        <div className="space-y-2">
          <p className="text-sm font-medium">New API Key (shown once)</p>
          <div className="flex space-x-2">
            <Input readOnly value={generatedKey} className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={handleCopy} disabled={copying}>
              {copying ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {!isLoading && !hasApiKeys && (
        <p className="text-sm text-muted-foreground">No API keys created yet.</p>
      )}

      {keys.map((key) => (
        <div key={key.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{key.name || "API key"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {key.prefix || "key"}-{key.start || key.id.slice(0, 8)}...
            </p>
          </div>
          <Button
            variant="destructive"
            size="icon"
            onClick={() => handleDelete(key.id)}
            disabled={deletingId !== null}
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
  );
}
