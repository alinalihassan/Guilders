"use client";

import { useUpdateUserSettings, useUser } from "@/lib/queries/useUser";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ApiKeyForm() {
  const { data: user, isLoading } = useUser();
  const { mutateAsync: updateUserSettings } = useUpdateUserSettings();
  const [copying, setCopying] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleCopy = async () => {
    if (!user?.settings.api_key) return;
    setCopying(true);
    await navigator.clipboard.writeText(user.settings.api_key);
    setTimeout(() => setCopying(false), 1000);
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      // Generate a random API key (32 characters)
      const apiKey = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      await updateUserSettings({ settings: { api_key: apiKey } });

      toast.success("API Key generated", {
        description: "Your API key has been generated successfully.",
      });
    } catch (error) {
      toast.error("Failed to generate API key", {
        description: "Please try again.",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await updateUserSettings({ settings: { api_key: null } });
      toast.success("API Key deleted", {
        description: "Your API key has been deleted successfully.",
      });
    } catch (error) {
      toast.error("Failed to delete API key", {
        description: "Please try again.",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">Loading...</div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Key</CardTitle>
        <CardDescription>
          Use this API key to access your data programmatically. Keep it secret
          and secure.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {user?.settings.api_key ? (
          <>
            <div className="flex space-x-2">
              <Input
                readOnly
                type="password"
                value={user.settings.api_key}
                className="font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                disabled={copying}
              >
                {copying ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button
              variant="destructive"
              onClick={handleDelete}
              // disabled={deleting}
              disabled={true}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete API Key"
              )}
            </Button>
          </>
        ) : (
          <Button
            onClick={handleGenerate}
            // disabled={generating}
            disabled={true}
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate API Key"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
