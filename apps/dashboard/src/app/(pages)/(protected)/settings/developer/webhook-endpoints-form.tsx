"use client";

import { Check, Copy, Loader2, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { env } from "@/lib/env";

type WebhookEndpoint = {
  id: string;
  url: string;
  description: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

type CreateResponse = WebhookEndpoint & { secret: string };

export function WebhookEndpointsForm() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copyingSecret, setCopyingSecret] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadEndpoints = useCallback(async () => {
    setIsLoading(true);
    const base = env.NEXT_PUBLIC_API_URL;
    const res = await fetch(`${base}/api/webhook`, { credentials: "include" });
    if (!res.ok) {
      toast.error("Failed to load webhook endpoints", { description: await res.text() });
      setIsLoading(false);
      return;
    }
    const data = (await res.json()) as WebhookEndpoint[];
    setEndpoints(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadEndpoints();
  }, [loadEndpoints]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error("URL is required");
      return;
    }
    setCreating(true);
    setCreatedSecret(null);
    try {
      const base = env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${base}/api/webhook`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), description: description.trim() || null }),
      });
      const data = (await res.json()) as CreateResponse | { error?: string };
      if (!res.ok) {
        toast.error("Failed to create webhook endpoint", {
          description: (data as { error?: string }).error ?? res.statusText,
        });
        setCreating(false);
        return;
      }
      const created = data as CreateResponse;
      setCreatedSecret(created.secret);
      setUrl("");
      setDescription("");
      await loadEndpoints();
      toast.success("Webhook endpoint created", {
        description: "Store the secret below; it will not be shown again.",
      });
    } catch (err) {
      toast.error("Failed to create webhook endpoint", { description: String(err) });
    } finally {
      setCreating(false);
    }
  };

  const handleCopySecret = async () => {
    if (!createdSecret) return;
    setCopyingSecret(true);
    await navigator.clipboard.writeText(createdSecret);
    toast.success("Secret copied to clipboard");
    setTimeout(() => setCopyingSecret(false), 1000);
  };

  const openEdit = (ep: WebhookEndpoint) => {
    setEditingId(ep.id);
    setEditDescription(ep.description ?? "");
    setEditEnabled(ep.enabled);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSavingEdit(true);
    try {
      const base = env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${base}/api/webhook/${editingId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editDescription || null, enabled: editEnabled }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error("Failed to update", { description: data.error ?? res.statusText });
        setSavingEdit(false);
        return;
      }
      await loadEndpoints();
      setEditingId(null);
      toast.success("Webhook endpoint updated");
    } catch (err) {
      toast.error("Failed to update", { description: String(err) });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const base = env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${base}/api/webhook/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        toast.error("Failed to delete webhook endpoint");
        setDeletingId(null);
        return;
      }
      await loadEndpoints();
      toast.success("Webhook endpoint deleted");
    } catch {
      toast.error("Failed to delete webhook endpoint");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Webhook endpoints</CardTitle>
          <CardDescription>Receive events when your accounts, transactions, or categories change.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-6">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook endpoints</CardTitle>
        <CardDescription>
          Receive events when your accounts, transactions, or categories change. Add a URL to receive
          POST requests with a signed payload.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="webhook-url">URL</Label>
            <Input
              id="webhook-url"
              type="url"
              placeholder="https://your-server.com/webhooks/guilders"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={creating}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="webhook-description">Description (optional)</Label>
            <Input
              id="webhook-description"
              placeholder="Production server"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={creating}
            />
          </div>
          <Button type="submit" disabled={creating}>
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add endpoint"
            )}
          </Button>
        </form>

        {createdSecret && (
          <div className="space-y-2 rounded-lg border border-amber-500/50 bg-amber-500/5 p-4">
            <p className="text-sm font-medium">Secret (store securely; shown only once)</p>
            <div className="flex gap-2">
              <Input readOnly value={createdSecret} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={handleCopySecret} disabled={copyingSecret}>
                {copyingSecret ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {endpoints.length === 0 && !createdSecret && (
          <p className="text-sm text-muted-foreground">No webhook endpoints yet.</p>
        )}

        <ul className="space-y-2">
          {endpoints.map((ep) => (
            <li
              key={ep.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{ep.url}</p>
                {ep.description && (
                  <p className="text-xs text-muted-foreground">{ep.description}</p>
                )}
                <span
                  className={`inline-block mt-1 text-xs ${ep.enabled ? "text-green-600" : "text-muted-foreground"}`}
                >
                  {ep.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Dialog open={editingId === ep.id} onOpenChange={(open) => !open && setEditingId(null)}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => openEdit(ep)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit webhook endpoint</DialogTitle>
                      <DialogDescription>Update description or enable/disable delivery.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label>Description</Label>
                        <Input
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Optional"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="edit-enabled"
                          checked={editEnabled}
                          onCheckedChange={(v) => setEditEnabled(v === true)}
                        />
                        <Label htmlFor="edit-enabled">Enabled</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveEdit} disabled={savingEdit}>
                        {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDelete(ep.id)}
                  disabled={deletingId !== null}
                >
                  {deletingId === ep.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
