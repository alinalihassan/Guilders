import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDialog } from "@/hooks/useDialog";
import { isDateOnlyTimestamp } from "@/lib/format-time";
import { useFiles } from "@/lib/queries/useFiles";
import { useMerchants } from "@/lib/queries/useMerchants";
import { useAddRule } from "@/lib/queries/useRules";
import { useRemoveTransaction, useUpdateTransaction } from "@/lib/queries/useTransactions";

import { AccountSelector } from "../common/account-selector";
import { CategorySelector } from "../common/category-selector";
import { DatePicker } from "../common/date-picker";
import { FileUploader } from "../common/file-uploader";
import { MerchantLogo } from "../common/merchant-logo";
import { MerchantSelector } from "../common/merchant-selector";
import { TagSelector } from "../common/tag-selector";
import { TimePicker } from "../common/time-picker";

const formSchema = z.object({
  accountId: z.number({
    required_error: "Please select an account",
  }),
  amount: z
    .string()
    .min(1, "Amount is required.")
    .regex(/^-?\d+(\.\d{1,2})?$/, "Invalid number format."),
  description: z.string().min(1, "Description is required."),
  categoryId: z.number({
    required_error: "Category is required.",
  }),
  merchantId: z.number().optional(),
  notes: z.string().optional(),
  tagIds: z.array(z.number()),
  timestamp: z.date(),
  documents: z.array(z.custom<File>()).optional(),
  rememberCategory: z.boolean(),
});

type FormSchema = z.infer<typeof formSchema>;

export function EditTransactionDialog() {
  const { isOpen, data, close } = useDialog("editTransaction");
  const { mutate: updateTransaction, isPending: isUpdating } = useUpdateTransaction();
  const { mutate: deleteTransaction, isPending: isDeleting } = useRemoveTransaction();
  const { mutate: addRule } = useAddRule();
  const { data: merchants } = useMerchants();
  const { documents, isLoadingDocuments, uploadFile, deleteFile, getFileUrl, isUploading } =
    useFiles({
      entityType: "transaction",
      entityId: data?.transaction?.id ?? 0,
    });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: (() => {
      return {
        accountId: data?.transaction?.account_id ?? undefined,
        amount: data?.transaction?.amount != null ? Number(data.transaction.amount).toString() : "",
        description: data?.transaction?.description ?? "",
        categoryId: data?.transaction?.category_id ?? undefined,
        merchantId: data?.transaction?.merchant_id ?? undefined,
        notes: data?.transaction?.notes ?? "",
        tagIds: data?.transaction?.tags?.map((tag) => tag.id) ?? [],
        timestamp:
          data?.transaction?.timestamp != null ? new Date(data.transaction.timestamp) : new Date(),
        documents: [],
        rememberCategory: false,
      };
    })(),
  });

  useEffect(() => {
    if (data?.transaction) {
      form.reset({
        accountId: data.transaction.account_id,
        amount: Number(data.transaction.amount).toString(),
        description: data.transaction.description,
        categoryId: data.transaction.category_id ?? undefined,
        merchantId: data.transaction.merchant_id ?? undefined,
        notes: data.transaction.notes ?? "",
        tagIds: data.transaction.tags?.map((tag) => tag.id) ?? [],
        timestamp:
          data.transaction.timestamp != null ? new Date(data.transaction.timestamp) : new Date(),
        documents: [],
        rememberCategory: false,
      });
    }
  }, [data?.transaction, form]);

  const merchantId = form.watch("merchantId");
  const formDescription = form.watch("description");
  const categoryId = form.watch("categoryId");
  const rememberCategory = form.watch("rememberCategory");

  if (!data?.transaction) return null;
  const { transaction } = data;

  const isSyncedTransaction = !!transaction.provider_transaction_id;
  const isDateOnly = isDateOnlyTimestamp(new Date(transaction.timestamp));
  const bankDescription = transaction.description?.trim() ?? "";
  const headerMerchant =
    merchantId != null ? merchants?.find((merchant) => merchant.id === merchantId) : undefined;
  const merchantName = headerMerchant?.name?.trim() ?? "";
  const description = (isSyncedTransaction ? bankDescription : formDescription)?.trim() ?? "";
  const headerTitle = merchantName || description || "Transaction";
  const headerSubtitle =
    merchantName && description && merchantName !== description ? description : undefined;

  const originalCategoryId = transaction.category_id ?? undefined;
  const categoryChanged = categoryId !== originalCategoryId;
  const payeeForRule = merchantName || description;
  const showRememberCategory = categoryChanged && !!payeeForRule && !!categoryId;

  const handleSubmit = form.handleSubmit((formData) => {
    const updatedTransaction = {
      id: transaction.id,
      account_id: formData.accountId,
      amount: formData.amount,
      description: formData.description,
      category_id: formData.categoryId,
      merchant_id: formData.merchantId,
      notes: formData.notes ?? "",
      tag_ids: formData.tagIds ?? [],
      timestamp: formData.timestamp,
      currency: transaction.currency,
      documents: transaction.documents,
      provider_transaction_id: transaction.provider_transaction_id,
    };

    updateTransaction(
      {
        transactionId: transaction.id,
        transaction: updatedTransaction,
      },
      {
        onSuccess: () => {
          if (formData.rememberCategory && formData.categoryId && payeeForRule) {
            addRule({
              enabled: true,
              payee_enabled: true,
              payee_match: "contains",
              payee_value: payeeForRule,
              amount_enabled: false,
              account_ids: [],
              set_category_id: formData.categoryId,
              tag_ids: [],
            });
          }
          close();
        },
        onError: (error) => {
          console.error("Error updating transaction:", error);
        },
      },
    );
  });

  const handleDelete = () => {
    deleteTransaction(transaction, {
      onSuccess: () => close(),
      onError: (error) => {
        console.error("Error deleting transaction:", error);
      },
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent className="flex h-full flex-col overflow-hidden p-0">
        <div className="flex-1 overflow-y-auto p-6">
          <SheetTitle className="hidden">Edit Transaction</SheetTitle>

          <div className="flex items-center space-x-4 border-b pb-6">
            <MerchantLogo
              key={`${headerMerchant?.id ?? "none"}-${headerMerchant?.logo_url ?? ""}`}
              name={headerTitle}
              logoUrl={headerMerchant?.logo_url}
              className="size-10 text-base"
            />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{headerTitle}</h2>
              {headerSubtitle && (
                <p className="text-muted-foreground truncate text-sm">{headerSubtitle}</p>
              )}
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={handleSubmit} className="mt-6">
              <div className="space-y-4 pb-8">
                {isSyncedTransaction && (
                  <div className="bg-muted text-muted-foreground rounded-md p-4 text-sm">
                    Amount, date, and description come from the connection. You can set merchant and
                    category.
                  </div>
                )}

                {isSyncedTransaction && bankDescription && (
                  <Collapsible key={transaction.id} className="space-y-2">
                    <CollapsibleTrigger
                      type="button"
                      className="text-muted-foreground hover:text-foreground group mx-auto flex items-center gap-1 text-sm"
                    >
                      <ChevronDown className="size-4" />
                      <span className="group-data-[state=closed]:hidden">Hide bank details</span>
                      <span className="group-data-[state=open]:hidden">Show bank details</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <Input value={bankDescription} disabled readOnly />
                    </CollapsibleContent>
                  </Collapsible>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="accountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account</FormLabel>
                        <FormControl>
                          <AccountSelector
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select account"
                            disabled={isSyncedTransaction}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter amount"
                            {...field}
                            disabled={isSyncedTransaction}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {!isSyncedTransaction && (
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="merchantId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Merchant</FormLabel>
                        <FormControl>
                          <MerchantSelector
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select or add merchant"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => {
                      const amountStr = form.watch("amount");
                      const num = parseFloat(amountStr);
                      const classification =
                        amountStr !== "" && !Number.isNaN(num)
                          ? num > 0
                            ? ("income" as const)
                            : ("expense" as const)
                          : undefined;
                      return (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <CategorySelector
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Select or add category"
                              classification={classification}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>

                {showRememberCategory && (
                  <FormField
                    control={form.control}
                    name="rememberCategory"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => field.onChange(checked === true)}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <Label
                            className="cursor-pointer font-normal"
                            onClick={() => field.onChange(!rememberCategory)}
                          >
                            Remember this category for future transactions
                          </Label>
                          <p className="text-muted-foreground text-xs">
                            Creates a rule matching “{payeeForRule}”.
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="tagIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <TagSelector
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select or add tags"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timestamp"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className={`grid gap-4 ${isDateOnly ? "grid-cols-1" : "grid-cols-2"}`}>
                          <div className="space-y-2">
                            <FormLabel>Date</FormLabel>
                            <DatePicker
                              date={field.value}
                              onDateChange={field.onChange}
                              disabled={isSyncedTransaction}
                              preserveTime={true}
                            />
                          </div>
                          {!isDateOnly && (
                            <div className="space-y-2">
                              <FormLabel>Time</FormLabel>
                              <TimePicker
                                date={field.value}
                                onDateChange={field.onChange}
                                disabled={isSyncedTransaction}
                              />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add notes..."
                          className="min-h-[80px] resize-y"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Accordion type="single" collapsible className="w-full">
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
              </div>

              <div className="bg-card absolute right-0 bottom-0 left-0 flex items-center justify-between border-t p-4">
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
                            disabled={isDeleting || isSyncedTransaction}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isSyncedTransaction
                          ? "Cannot delete synced transaction — remove the connection instead in Settings → Connections."
                          : "Delete this transaction. This cannot be undone."}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete transaction</AlertDialogTitle>
                      <AlertDialogDescription>
                        Delete this transaction? This cannot be undone.
                        {isSyncedTransaction &&
                          " Synced transactions cannot be deleted; remove the connection instead."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={isDeleting || isSyncedTransaction}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? "Deleting…" : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button type="submit" disabled={isUpdating || isDeleting}>
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
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
