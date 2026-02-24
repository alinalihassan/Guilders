"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type AccountSubtype, accountSubtypeLabels, accountSubtypes } from "@/lib/account-types";
import { useDialog } from "@/lib/hooks/useDialog";
import { useRemoveAccount, useUpdateAccount } from "@/lib/queries/useAccounts";
import { useReconnectConnection } from "@/lib/queries/useConnections";
import { useCurrencies } from "@/lib/queries/useCurrencies";
import { useFiles } from "@/lib/queries/useFiles";
import { useInstitutionConnection } from "@/lib/queries/useInstitutionConnection";
import { useInstitutionByAccountId } from "@/lib/queries/useInstitutions";
import { useProviderConnections } from "@/lib/queries/useProviderConnections";
import type { Currency } from "@guilders/api/types";

import { FileUploader } from "../common/file-uploader";
import { AccountIcon } from "../dashboard/accounts/account-icon";

const detailsSchema = z.object({
  accountType: z.enum(accountSubtypes),
  accountName: z.string().min(1, "Account name is required."),
  value: z
    .string()
    .min(1, "Value is required.")
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid number format."),
  currency: z.string(),
});

const taxSchema = z.object({
  investable: z.enum(["non_investable", "investable_easy_convert", "investable_cash"]),
  taxability: z.enum(["taxable", "tax_free", "tax_deferred"]),
  taxRate: z
    .string()
    .regex(/^\d*\.?\d*$/, "Invalid tax rate")
    .optional(),
});

const notesSchema = z.object({
  notes: z.string().optional(),
  documents: z.array(z.instanceof(File)).optional(),
});

const formSchema = detailsSchema.merge(taxSchema).merge(notesSchema);

type FormSchema = z.infer<typeof formSchema>;

export function EditAccountDialog() {
  const { isOpen, data, close } = useDialog("editAccount");
  const { open: openProviderDialog } = useDialog("provider");
  const { data: connections } = useProviderConnections();
  const institution = useInstitutionByAccountId(data?.account?.id);
  const { data: institutionConnection } = useInstitutionConnection(
    data?.account?.institution_connection_id ?? 0,
  );
  const connection = connections?.find(
    (c) => c.id === institutionConnection?.provider_connection_id,
  );
  const { data: currencies } = useCurrencies();

  const { mutate: updateAccount, isPending: isUpdating } = useUpdateAccount();
  const { mutateAsync: reconnectConnection, isPending: isReconnecting } = useReconnectConnection();
  const { mutate: deleteAccount, isPending: isDeleting } = useRemoveAccount();

  const { uploadFile, deleteFile, getSignedUrl, isUploading } = useFiles({
    entityType: "account",
    entityId: data?.account?.id ?? 0,
  });

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountType: (data?.account?.subtype as AccountSubtype) ?? accountSubtypes[0],
      accountName: data?.account?.name ?? "",
      value: data?.account?.value.toString() ?? "",
      currency: data?.account?.currency ?? "",
      investable: data?.account?.investable ?? "non_investable",
      taxability: data?.account?.taxability ?? "taxable",
      taxRate: data?.account?.tax_rate?.toString() ?? "",
      notes: data?.account?.notes ?? "",
      documents: [],
    },
  });

  useEffect(() => {
    if (data?.account) {
      form.reset({
        accountType: data.account.subtype as AccountSubtype,
        accountName: data.account.name,
        value: data.account.value.toString(),
        currency: data.account.currency,
        investable: data.account.investable,
        taxability: data.account.taxability,
        taxRate: data.account.tax_rate?.toString() ?? "",
        notes: data.account.notes,
        documents: [],
      });
    }
  }, [data?.account, form]);

  if (!isOpen || !data?.account) return null;
  const { account } = data;

  const isSyncedAccount = !!account.institution_connection_id;

  const handleFixConnection = async () => {
    if (!institution || !connection) {
      toast.error("Failed to fix connection", {
        description: "Unable to fix connection. Please try again later.",
      });
      return;
    }

    const { redirectURI, type: redirectType } = await reconnectConnection({
      providerId: connection.provider_id.toString(),
      institutionId: institution.id.toString(),
      accountId: account.id.toString(),
    });

    if (redirectURI) {
      close();
      openProviderDialog({
        redirectUri: redirectURI,
        operation: "reconnect",
        redirectType,
      });
    } else {
      close();
      toast.error("Failed to fix connection", {
        description: "Unable to fix connection. Please try again later.",
      });
    }
  };

  const handleSubmit = form.handleSubmit(async (data) => {
    const updatedAccount = {
      subtype: data.accountType,
      name: data.accountName,
      value: Number.parseFloat(data.value),
      currency: data.currency,
      investable: data.investable,
      taxability: data.taxability,
      tax_rate: data.taxRate ? Number.parseFloat(data.taxRate) : null,
      notes: data.notes ?? "",
    };

    updateAccount(
      {
        id: account.id,
        account: updatedAccount,
      },
      {
        onSuccess: () => {
          close();
        },
        onError: (error) => {
          console.error("Error updating account:", error);
        },
      },
    );
  });

  const handleDelete = () => {
    deleteAccount(account.id, {
      onSuccess: () => {
        close();
      },
      onError: (error) => {
        console.error("Error deleting account:", error);
      },
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="overflow-hidden p-0 flex flex-col h-full">
        <div className="p-6 flex-1 overflow-y-auto">
          <SheetTitle className="hidden">Edit Account</SheetTitle>

          {account && (
            <div className="flex items-center space-x-4 pb-6 border-b">
              <AccountIcon
                account={account}
                width={40}
                height={40}
                hasImageError={false}
                onImageError={() => {}}
              />
              <div>
                <h2 className="text-lg font-semibold">{account.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {account.institution_connection_id ? "Connected Account" : "Manual Account"}
                </p>
              </div>
            </div>
          )}

          {isSyncedAccount && (
            <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md mt-4">
              This account is managed by an external connection. Some fields cannot be edited.
            </div>
          )}

          {account.institution_connection?.broken && (
            <div className="flex flex-col gap-2 mt-4">
              <div className="text-sm text-yellow-500 bg-yellow-500/10 p-4 rounded-md flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>This account&apos;s connection needs to be fixed.</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 hover:text-foreground ml-auto"
                  onClick={handleFixConnection}
                  disabled={isReconnecting}
                >
                  {isReconnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Fixing...
                    </>
                  ) : (
                    "Fix Connection"
                  )}
                </Button>
              </div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={handleSubmit} className="mt-6">
              <div className="space-y-4 pb-8">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="accountName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter account name"
                            {...field}
                            disabled={isSyncedAccount}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isSyncedAccount}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select account type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accountSubtypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {accountSubtypeLabels[type]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Enter value"
                            {...field}
                            disabled={isSyncedAccount}
                          />
                        </FormControl>
                        <FormField
                          control={form.control}
                          name="currency"
                          render={({ field }) => (
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              disabled={isSyncedAccount}
                            >
                              <FormControl>
                                <SelectTrigger className="max-w-[142px]">
                                  <SelectValue placeholder="Currency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {currencies?.map((currency: Currency) => (
                                  <SelectItem key={currency.code} value={currency.code}>
                                    {currency.code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="tax">
                    <AccordionTrigger>Tax Settings</AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="investable"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Investability</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select investability" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="non_investable">Non-investable</SelectItem>
                                <SelectItem value="investable_easy_convert">
                                  Easily Convertible
                                </SelectItem>
                                <SelectItem value="investable_cash">Cash</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="taxability"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Taxability</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select taxability" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="taxable">Taxable</SelectItem>
                                <SelectItem value="tax_free">Tax Free</SelectItem>
                                <SelectItem value="tax_deferred">Tax Deferred</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="taxRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax Rate (%)</FormLabel>
                            <FormControl>
                              <Input type="text" placeholder="Enter tax rate" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="notes">
                    <AccordionTrigger>Notes</AccordionTrigger>
                    <AccordionContent>
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                placeholder="Enter notes about this account"
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="documents">
                    <AccordionTrigger>Documents</AccordionTrigger>
                    <AccordionContent>
                      <FormField
                        control={form.control}
                        name="documents"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <FileUploader
                                value={field.value}
                                onValueChange={field.onChange}
                                maxFileCount={10}
                                maxSize={10 * 1024 * 1024}
                                accept={{
                                  "application/pdf": [],
                                  "image/*": [],
                                }}
                                onUpload={uploadFile}
                                disabled={isUploading}
                                documents={data?.account?.documents?.map((id) => ({
                                  id: Number(id),
                                  name: `Document ${id}`,
                                  path: "",
                                }))}
                                onRemoveExisting={deleteFile}
                                onView={getSignedUrl}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="danger" className="hidden">
                    <AccordionTrigger>Danger Zone</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Deleting this account will permanently remove it and all associated
                          transactions. This action cannot be undone.
                        </p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={handleDelete}
                                disabled={isDeleting || isSyncedAccount}
                              >
                                {isDeleting ? (
                                  <>
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="mr-2 h-3 w-3" />
                                    Delete Account
                                  </>
                                )}
                              </Button>
                            </div>
                          </TooltipTrigger>
                          {isSyncedAccount && (
                            <TooltipContent>
                              Connected accounts cannot be deleted. Remove the connection instead.
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="absolute bottom-0 left-0 right-0 flex justify-end p-4 bg-background border-t">
                  <Button type="submit" disabled={isUpdating}>
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
