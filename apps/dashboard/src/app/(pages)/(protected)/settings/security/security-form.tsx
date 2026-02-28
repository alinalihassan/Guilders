"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Shield, Trash2, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";

import { useDialog } from "@/hooks/useDialog";
import {
  mfaQueryKey,
  useAddPasskey,
  useDeletePasskey,
  useMFAStatus,
  usePasskeys,
  useRenamePasskey,
} from "@/lib/queries/useSecurity";
import { useUpdateUserSettings } from "@/lib/queries/useUser";
import { useSecurityStore } from "@/lib/store/securityStore";

const securityFormSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SecurityFormValues = z.infer<typeof securityFormSchema>;
type PromptConfig = {
  title: string;
  description: string;
  placeholder: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  inputType?: "text" | "password";
  validate?: (value: string) => string | null;
};

export function SecurityForm() {
  const { data: hasMFA, isLoading: isLoadingMFA } = useMFAStatus();
  const { data: passkeys = [], isLoading: isLoadingPasskeys } = usePasskeys();
  const { unenrollMFA } = useSecurityStore();
  const queryClient = useQueryClient();
  const { open: openMFADialog } = useDialog("mfa");
  const { open: openInputPrompt } = useDialog("inputPrompt");
  const { mutateAsync: updateUserSettings } = useUpdateUserSettings();

  const addPasskey = useAddPasskey();
  const renamePasskey = useRenamePasskey();
  const deletePasskey = useDeletePasskey();

  const isMutatingPasskey =
    addPasskey.isPending || renamePasskey.isPending || deletePasskey.isPending;

  const form = useForm<SecurityFormValues>({
    resolver: zodResolver(securityFormSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  async function onSubmit(data: SecurityFormValues) {
    try {
      await updateUserSettings({
        password: data.newPassword,
      });

      form.reset({
        newPassword: "",
        confirmPassword: "",
      });

      toast.success("Password updated", {
        description: "Your password has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("Failed to update password", {
        description: "Please try again.",
      });
    }
  }

  const openPrompt = (config: PromptConfig) =>
    new Promise<string | null>((resolve) => {
      openInputPrompt({
        ...config,
        onConfirm: (value) => resolve(value),
        onCancel: () => resolve(null),
      });
    });

  const handleUnenroll = async () => {
    const password = await openPrompt({
      title: "Disable Two-Factor Authentication",
      description: "Enter your current password to disable 2FA.",
      placeholder: "Current password",
      inputType: "password",
      confirmText: "Disable 2FA",
      validate: (value) => (!value ? "Current password is required." : null),
    });
    if (!password) return;
    try {
      await unenrollMFA(password);
      queryClient.invalidateQueries({ queryKey: mfaQueryKey });
      toast.success("2FA Removed", {
        description: "Two-factor authentication has been removed.",
      });
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      toast.error("Failed to disable 2FA", {
        description: "Please try again.",
      });
    }
  };

  const handleAddPasskey = async () => {
    try {
      await addPasskey.mutateAsync();
      toast.success("Passkey added");
    } catch (error) {
      toast.error("Failed to add passkey", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleRenamePasskey = async (id: string, currentName?: string) => {
    const name = await openPrompt({
      title: "Rename Passkey",
      description: "Enter a new name for this passkey.",
      placeholder: "Passkey name",
      defaultValue: currentName ?? "",
      confirmText: "Rename",
      validate: (value) => (!value ? "Passkey name is required." : null),
    });
    if (!name || name === currentName) return;
    try {
      await renamePasskey.mutateAsync({ id, name });
      toast.success("Passkey renamed");
    } catch (error) {
      toast.error("Failed to rename passkey", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleDeletePasskey = async (id: string) => {
    try {
      await deletePasskey.mutateAsync(id);
      toast.success("Passkey deleted");
    } catch (error) {
      toast.error("Failed to delete passkey", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Two-Factor Authentication</h2>
        <p className="text-sm text-muted-foreground">
          Add an extra layer of security to your account by requiring both a password and
          authentication code.
        </p>

        <div className="flex h-10 items-center gap-4">
          <Button
            variant={hasMFA ? "outline" : "default"}
            className="w-full sm:w-auto"
            onClick={() => !hasMFA && openMFADialog()}
            disabled={isLoadingMFA || hasMFA}
          >
            <Shield className="mr-2 h-4 w-4" />
            {isLoadingMFA ? "Loading..." : hasMFA ? "2FA is Enabled" : "Enable 2FA"}
          </Button>

          {hasMFA && (
            <Button
              variant="destructive"
              size="icon"
              onClick={handleUnenroll}
              className="shrink-0"
              disabled={isLoadingMFA}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Passkeys</h2>
        <p className="text-sm text-muted-foreground">
          Manage biometric passkeys for passwordless sign-in.
        </p>
        <Button variant="outline" onClick={handleAddPasskey} disabled={isMutatingPasskey}>
          Add passkey
        </Button>
        {isLoadingPasskeys ? (
          <p className="text-sm text-muted-foreground">Loading passkeys...</p>
        ) : passkeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No passkeys registered yet.</p>
        ) : (
          <div className="space-y-2">
            {passkeys.map((passkey) => (
              <div
                key={passkey.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {passkey.name || "Unnamed passkey"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{passkey.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRenamePasskey(passkey.id, passkey.name)}
                    disabled={isMutatingPasskey}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeletePasskey(passkey.id)}
                    disabled={isMutatingPasskey}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Change Password</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                      autoComplete="new-password"
                    />
                  </FormControl>
                  <FormDescription>
                    Password must be at least 8 characters and contain at least one uppercase
                    letter, one lowercase letter, and one number.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                      autoComplete="new-password"
                    />
                  </FormControl>
                  <FormDescription>Please confirm your new password.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={
                !form.formState.isDirty || form.formState.isSubmitting || !form.formState.isValid
              }
            >
              {form.formState.isSubmitting ? "Updating..." : "Update password"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
