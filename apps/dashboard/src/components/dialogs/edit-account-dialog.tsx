import type { UpdateAccount } from "@guilders/api/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDialog } from "@/hooks/useDialog";
import { type AccountSubtype, accountSubtypeLabels, accountSubtypes } from "@/lib/account-types";
import { useRemoveAccount, useUpdateAccount } from "@/lib/queries/useAccounts";
import { useReconnectConnection } from "@/lib/queries/useConnections";
import { useCurrencies } from "@/lib/queries/useCurrencies";
import { useFiles } from "@/lib/queries/useFiles";
import { useInstitutionConnection } from "@/lib/queries/useInstitutionConnection";
import { useInstitutionByAccountId } from "@/lib/queries/useInstitutions";
import { useProviderConnections } from "@/lib/queries/useProviderConnections";
import { CLOSE_DELAY_MS } from "@/lib/store/dialogStore";

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

  const { documents, isLoadingDocuments, uploadFile, deleteFile, getFileUrl, isUploading } =
    useFiles({
      entityType: "account",
      entityId: data?.account?.id ?? 0,
    });

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountType: (data?.account?.subtype as AccountSubtype) ?? accountSubtypes[0],
      accountName: data?.account?.name ?? "",
      value: data?.account?.value != null ? Number(data.account.value).toString() : "",
      currency: data?.account?.currency ?? "",
      investable: data?.account?.investable ?? "non_investable",
      taxability: data?.account?.taxability ?? "taxable",
      taxRate: data?.account?.tax_rate != null ? Number(data.account.tax_rate).toString() : "",
      notes: data?.account?.notes ?? "",
      documents: [],
    },
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (data?.account) {
      form.reset({
        accountType: data.account.subtype as AccountSubtype,
        accountName: data.account.name,
        value: Number(data.account.value).toString(),
        currency: data.account.currency,
        investable: data.account.investable,
        taxability: data.account.taxability,
        taxRate: data.account.tax_rate != null ? Number(data.account.tax_rate).toString() : "",
        notes: data.account.notes,
        documents: [],
      });
    }
  }, [data?.account, form]);

  if (!data?.account) return null;
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
      setTimeout(
        () =>
          openProviderDialog({
            redirectUri: redirectURI,
            operation: "reconnect",
            redirectType,
          }),
        CLOSE_DELAY_MS,
      );
    } else {
      close();
      setTimeout(
        () =>
          toast.error("Failed to fix connection", {
            description: "Unable to fix connection. Please try again later.",
          }),
        CLOSE_DELAY_MS,
      );
    }
  };

  const handleSubmit = form.handleSubmit(async (formData: FormSchema) => {
    const updatedAccount: UpdateAccount = {
      subtype: formData.accountType as UpdateAccount["subtype"],
      name: formData.accountName,
      value: formData.value,
      currency: formData.currency,
      investable: formData.investable as UpdateAccount["investable"],
      taxability: formData.taxability as UpdateAccount["taxability"],
      tax_rate: formData.taxRate ? formData.taxRate : null,
      notes: formData.notes ?? "",
    };

    updateAccount(
      {
        id: account.id,
        account: updatedAccount,
      },
      {
        onSuccess: () => close(),
        onError: (error) => {
          console.error("Error updating account:", error);
        },
      },
    );
  });

  const handleDelete = () => {
    deleteAccount(account.id, {
      onSuccess: () => close(),
      onError: (error) => {
        console.error("Error deleting account:", error);
      },
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent className="flex h-full flex-col overflow-hidden p-0">
        <div className="flex-1 overflow-y-auto p-6">
          <SheetTitle className="hidden">Edit Account</SheetTitle>

          {account && (
            <div className="flex items-center space-x-4 border-b pb-6">
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
            <div className="mt-4 rounded-md bg-muted p-4 text-sm text-muted-foreground">
              This account is managed by an external connection. Some fields cannot be edited.
            </div>
          )}

          {account.institutionConnection?.broken && (
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 rounded-md bg-yellow-500/10 p-4 text-sm text-yellow-500">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>This account&apos;s connection needs to be fixed.</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="ml-auto border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 hover:text-foreground"
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
                          render={({ field: currencyField }) => (
                            <Select
                              onValueChange={currencyField.onChange}
                              defaultValue={currencyField.value}
                              disabled={isSyncedAccount}
                            >
                              <FormControl>
                                <SelectTrigger className="max-w-[142px]">
                                  <SelectValue placeholder="Currency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {currencies?.map((currency) => (
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
                                documents={documents}
                                isLoadingDocuments={isLoadingDocuments}
                                onRemoveExisting={async (id) => {
                                  await deleteFile(id);
                                }}
                                getFileUrl={getFileUrl}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between border-t bg-card p-4">
                  <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteDialogOpen(true)}
                              disabled={isDeleting || isSyncedAccount}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isSyncedAccount
                            ? "Cannot delete linked account. Remove the connection first in Settings → Connections."
                            : "Delete this account and all its transactions."}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete account</AlertDialogTitle>
                        <AlertDialogDescription>
                          Delete this account and all its transactions? This cannot be undone.
                          {isSyncedAccount &&
                            " Connected accounts cannot be deleted; remove the connection instead."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          disabled={isDeleting || isSyncedAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isDeleting ? "Deleting…" : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
