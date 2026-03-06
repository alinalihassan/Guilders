"use client";

import { Check, Copy, Loader2, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import {
  useCreateWebhook,
  useDeleteWebhook,
  useUpdateWebhook,
  useWebhooks,
  type Webhook,
} from "@/lib/queries/useWebhooks";

export function WebhooksSection() {
  const [url, setUrl] = useState("");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copyingSecret, setCopyingSecret] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEnabled, setEditEnabled] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: endpoints = [], isLoading } = useWebhooks();
  const createWebhook = useCreateWebhook();
  const updateWebhook = useUpdateWebhook();
  const deleteWebhook = useDeleteWebhook();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error("URL is required");
      return;
    }
    setCreatedSecret(null);
    try {
      const created = await createWebhook.mutateAsync({ url: url.trim() });
      setCreatedSecret(created.secret);
      setUrl("");
      toast.success("Webhook endpoint created", {
        description: "Store the secret below; it will not be shown again.",
      });
    } catch {
      // Error already surfaced by hook
    }
  };

  const handleCopySecret = async () => {
    if (!createdSecret) return;
    setCopyingSecret(true);
    await navigator.clipboard.writeText(createdSecret);
    toast.success("Secret copied to clipboard");
    setTimeout(() => setCopyingSecret(false), 1000);
  };

  const openEdit = (ep: Webhook) => {
    setEditingId(ep.id);
    setEditEnabled(ep.enabled);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await updateWebhook.mutateAsync({ id: editingId, enabled: editEnabled });
      setEditingId(null);
      toast.success("Webhook endpoint updated");
    } catch {
      // Error already surfaced by hook
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteWebhook.mutateAsync(id);
      toast.success("Webhook endpoint deleted");
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
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="space-y-3">
        <div className="grid gap-2">
          <Label htmlFor="webhook-url">URL</Label>
          <Input
            id="webhook-url"
            type="url"
            placeholder="https://your-server.com/webhooks/guilders"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={createWebhook.isPending}
          />
        </div>
        <Button type="submit" disabled={createWebhook.isPending}>
          {createWebhook.isPending ? (
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
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopySecret}
              disabled={copyingSecret}
            >
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
              <p className="break-all text-sm font-medium">{ep.url}</p>
              <span
                className={`mt-1 inline-block text-xs ${ep.enabled ? "text-green-600" : "text-muted-foreground"}`}
              >
                {ep.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Dialog
                open={editingId === ep.id}
                onOpenChange={(open) => !open && setEditingId(null)}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => openEdit(ep)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit webhook endpoint</DialogTitle>
                    <DialogDescription>Enable or disable delivery to this URL.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
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
                    <Button onClick={handleSaveEdit} disabled={updateWebhook.isPending}>
                      {updateWebhook.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
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
    </div>
  );
}
