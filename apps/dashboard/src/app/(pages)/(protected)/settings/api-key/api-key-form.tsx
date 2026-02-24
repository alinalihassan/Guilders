"use client";

import { Check, Copy, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/auth-client";

type ApiKeyRecord = {
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
};

export function ApiKeyForm() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const hasApiKeys = useMemo(() => keys.length > 0, [keys.length]);

  const loadApiKeys = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await authApi.listApiKeys();
    if (error) {
      toast.error("Failed to load API keys", {
        description: error.message,
      });
      setIsLoading(false);
      return;
    }

    const records: ApiKeyRecord[] = Array.isArray(data)
      ? data
          .map(
            (item) =>
              ({
                id: String((item as { id?: unknown }).id ?? ""),
                name: (item as { name?: string | null }).name ?? null,
                start: (item as { start?: string | null }).start ?? null,
                prefix: (item as { prefix?: string | null }).prefix ?? null,
              }) satisfies ApiKeyRecord,
          )
          .filter((item) => item.id.length > 0)
      : [];
    setKeys(records);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  const handleCopy = async () => {
    if (!generatedKey) return;
    setCopying(true);
    await navigator.clipboard.writeText(generatedKey);
    setTimeout(() => setCopying(false), 1000);
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const { data, error } = await authApi.createApiKey({
        name: "Dashboard API Key",
        prefix: "gld",
      });
      if (error) {
        throw new Error(error.message);
      }
      setGeneratedKey((data as { key?: string } | null)?.key ?? null);
      await loadApiKeys();

      toast.success("API Key generated", {
        description: "Your API key has been generated successfully.",
      });
    } catch {
      toast.error("Failed to generate API key", {
        description: "Please try again.",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (keyId: string) => {
    try {
      setDeleting(true);
      const { error } = await authApi.deleteApiKey({ keyId });
      if (error) throw new Error(error.message);
      await loadApiKeys();
      toast.success("API key revoked");
    } catch {
      toast.error("Failed to delete API key", {
        description: "Please try again.",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-6">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Key</CardTitle>
        <CardDescription>
          Use API keys to access your data programmatically. Store generated keys securely because
          they are shown only once.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? (
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
          <div
            key={key.id}
            className="rounded-md border p-3 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{key.name || "API key"}</p>
              <p className="text-xs text-muted-foreground truncate">
                {key.prefix || "key"}-{key.start || key.id.slice(0, 8)}...
              </p>
            </div>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => handleDelete(key.id)}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
