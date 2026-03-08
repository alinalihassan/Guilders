import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDialog } from "@/hooks/useDialog";
import { useAccounts } from "@/lib/queries/useAccounts";
import { useFiles } from "@/lib/queries/useFiles";
import { useRemoveTransaction, useUpdateTransaction } from "@/lib/queries/useTransactions";

import { AccountSelector } from "../common/account-selector";
import { CategorySelector } from "../common/category-selector";
import { DatePicker } from "../common/date-picker";
import { FileUploader } from "../common/file-uploader";
import { TimePicker } from "../common/time-picker";
import { AccountIcon } from "../dashboard/accounts/account-icon";

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
  timestamp: z.date(),
  documents: z.array(z.custom<File>()).optional(),
});

type FormSchema = z.infer<typeof formSchema>;

export function EditTransactionDialog() {
  const { isOpen, data, close } = useDialog("editTransaction");
  const { mutate: updateTransaction, isPending: isUpdating } = useUpdateTransaction();
  const { mutate: deleteTransaction, isPending: isDeleting } = useRemoveTransaction();
  const { data: accounts } = useAccounts();
  const { documents, isLoadingDocuments, uploadFile, deleteFile, getFileUrl, isUploading } =
    useFiles({
      entityType: "transaction",
      entityId: data?.transaction?.id ?? 0,
    });

  const currentAccount = accounts?.find((account) => account.id === data?.transaction?.account_id);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: (() => {
      return {
        accountId: data?.transaction?.account_id ?? undefined,
        amount: data?.transaction?.amount != null ? Number(data.transaction.amount).toString() : "",
        description: data?.transaction?.description ?? "",
        categoryId: data?.transaction?.category_id ?? undefined,
        timestamp:
          data?.transaction?.timestamp != null ? new Date(data.transaction.timestamp) : new Date(),
        documents: [],
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
        timestamp:
          data.transaction.timestamp != null ? new Date(data.transaction.timestamp) : new Date(),
        documents: [],
      });
    }
  }, [data?.transaction, form]);

  if (!data?.transaction) return null;
  const { transaction } = data;

  const isSyncedTransaction = !!transaction.provider_transaction_id;

  const handleSubmit = form.handleSubmit((formData) => {
    const updatedTransaction = {
      id: transaction.id,
      account_id: formData.accountId,
      amount: formData.amount,
      description: formData.description,
      category_id: formData.categoryId,
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
        onSuccess: () => close(),
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

          {currentAccount && (
            <div className="flex items-center space-x-4 border-b pb-6">
              <AccountIcon
                account={currentAccount}
                width={40}
                height={40}
                hasImageError={false}
                onImageError={() => {}}
              />
              <div>
                <h2 className="text-lg font-semibold">{currentAccount.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {currentAccount.institution_connection_id
                    ? "Connected Account"
                    : "Manual Account"}
                </p>
              </div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={handleSubmit} className="mt-6">
              <div className="space-y-4 pb-8">
                {isSyncedTransaction && (
                  <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
                    This transaction is managed by an external connection. It cannot be edited.
                  </div>
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
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter description"
                            {...field}
                            disabled={isSyncedTransaction}
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
                              disabled={isSyncedTransaction}
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

                <FormField
                  control={form.control}
                  name="timestamp"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <FormLabel>Date</FormLabel>
                            <DatePicker
                              date={field.value}
                              onDateChange={field.onChange}
                              disabled={isSyncedTransaction}
                              preserveTime={true}
                            />
                          </div>
                          <div className="space-y-2">
                            <FormLabel>Time</FormLabel>
                            <TimePicker
                              date={field.value}
                              onDateChange={field.onChange}
                              disabled={isSyncedTransaction}
                            />
                          </div>
                        </div>
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

                  <AccordionItem value="danger">
                    <AccordionTrigger>Danger Zone</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Deleting this transaction will permanently remove it. This action cannot
                          be undone.
                        </p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={handleDelete}
                                disabled={isDeleting || isSyncedTransaction}
                              >
                                {isDeleting ? (
                                  <>
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="mr-2 h-3 w-3" />
                                    Delete Transaction
                                  </>
                                )}
                              </Button>
                            </div>
                          </TooltipTrigger>
                          {isSyncedTransaction && (
                            <TooltipContent>
                              Synced transactions cannot be deleted. Remove the connection instead.
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              <div className="absolute bottom-0 left-0 right-0 flex justify-end border-t bg-card p-4">
                <Button type="submit" disabled={isUpdating || isDeleting || isSyncedTransaction}>
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
