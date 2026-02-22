"use client";

import { useDialog } from "@/lib/hooks/useDialog";
import { useAccounts } from "@/lib/queries/useAccounts";
import { useFiles } from "@/lib/queries/useFiles";
import {
  useRemoveTransaction,
  useUpdateTransaction,
} from "@/lib/queries/useTransactions";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DateTimePicker } from "../common/datetime-picker";
import { FileUploader } from "../common/file-uploader";
import { AccountIcon } from "../dashboard/accounts/account-icon";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const formSchema = z.object({
  accountId: z.number({
    required_error: "Please select an account",
  }),
  amount: z
    .string()
    .min(1, "Amount is required.")
    .regex(/^-?\d+(\.\d{1,2})?$/, "Invalid number format."),
  description: z.string().min(1, "Description is required."),
  category: z.string().min(1, "Category is required."),
  date: z.string().min(1, "Date is required."),
  documents: z.array(z.custom<File>()).optional(),
});

type FormSchema = z.infer<typeof formSchema>;

function formatDateForInput(dateString: string) {
  const date = new Date(dateString);
  return date.toISOString().slice(0, 16);
}

function formatDateForSubmit(dateString: string) {
  return new Date(dateString).toISOString();
}

export function EditTransactionDialog() {
  const { isOpen, data, close } = useDialog("editTransaction");
  const { mutate: updateTransaction, isPending: isUpdating } =
    useUpdateTransaction();
  const { mutate: deleteTransaction, isPending: isDeleting } =
    useRemoveTransaction();
  const { data: accounts } = useAccounts();
  const { uploadFile, deleteFile, getSignedUrl, isUploading } = useFiles({
    entityType: "transaction",
    entityId: data?.transaction?.id ?? 0,
  });

  const currentAccount = accounts?.find(
    (account) => account.id === data?.transaction?.account_id,
  );

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountId: data?.transaction?.account_id ?? undefined,
      amount: data?.transaction?.amount.toString() ?? "",
      description: data?.transaction?.description ?? "",
      category: data?.transaction?.category ?? "",
      date: data?.transaction?.date
        ? formatDateForInput(data.transaction.date)
        : "",
      documents: [],
    },
  });

  useEffect(() => {
    if (data?.transaction) {
      form.reset({
        accountId: data.transaction.account_id,
        amount: data.transaction.amount.toString(),
        description: data.transaction.description,
        category: data.transaction.category,
        date: formatDateForInput(data.transaction.date),
        documents: [],
      });
    }
  }, [data?.transaction, form]);

  if (!isOpen || !data?.transaction) return null;
  const { transaction } = data;

  const isSyncedTransaction = !!transaction.provider_transaction_id;

  const handleSubmit = form.handleSubmit((formData) => {
    const updatedTransaction = {
      id: transaction.id,
      account_id: formData.accountId,
      amount: Number.parseFloat(formData.amount),
      description: formData.description,
      category: formData.category,
      date: formatDateForSubmit(formData.date),
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
      onSuccess: () => {
        close();
      },
      onError: (error) => {
        console.error("Error deleting transaction:", error);
      },
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="overflow-hidden p-0 flex flex-col h-full">
        <div className="p-6 flex-1 overflow-y-auto">
          <SheetTitle className="hidden">Edit Transaction</SheetTitle>

          {currentAccount && (
            <div className="flex items-center space-x-4 pb-6 border-b">
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
                  <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md">
                    This transaction is managed by an external connection. It
                    cannot be edited.
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="accountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(Number.parseInt(value))
                          }
                          defaultValue={field.value?.toString()}
                          disabled={isSyncedTransaction}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue>
                                {currentAccount?.name ?? "Select account"}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accounts?.map((account) => {
                              const isConnected =
                                !!account.institution_connection_id;
                              return (
                                <SelectItem
                                  key={account.id}
                                  value={account.id.toString()}
                                  disabled={
                                    isConnected &&
                                    account.id !== currentAccount?.id
                                  }
                                >
                                  {account.name}
                                  {isConnected && " (Connected)"}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
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
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter category"
                            {...field}
                            disabled={isSyncedTransaction}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date & Time</FormLabel>
                      <FormControl>
                        <DateTimePicker
                          date={field.value ? new Date(field.value) : undefined}
                          onDateChange={(date) => {
                            if (date) {
                              field.onChange(date.toISOString());
                            }
                          }}
                          onTimeChange={(time) => {
                            if (field.value) {
                              const currentDate = new Date(field.value);
                              const [hours, minutes] = time.split(":");
                              currentDate.setHours(
                                Number.parseInt(hours || "0"),
                                Number.parseInt(minutes || "0"),
                              );
                              field.onChange(currentDate.toISOString());
                            }
                          }}
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
                                documents={data?.transaction?.documents?.map(
                                  (id) => ({
                                    id: Number(id),
                                    name: `Document ${id}`,
                                    path: "",
                                  }),
                                )}
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

                  <AccordionItem value="danger">
                    <AccordionTrigger>Danger Zone</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Deleting this transaction will permanently remove it.
                          This action cannot be undone.
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
                              Synced transactions cannot be deleted. Remove the
                              connection instead.
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              <div className="absolute bottom-0 left-0 right-0 flex justify-end p-4 bg-background border-t">
                <Button
                  type="submit"
                  disabled={isUpdating || isDeleting || isSyncedTransaction}
                >
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
