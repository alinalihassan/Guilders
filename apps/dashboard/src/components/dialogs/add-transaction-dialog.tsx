"use client";

import type { Currency } from "@guilders/api/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { DateTimePicker } from "@/components/common/datetime-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useDialog } from "@/hooks/useDialog";
import { useAccounts } from "@/lib/queries/useAccounts";
import { useCurrencies } from "@/lib/queries/useCurrencies";
import { useAddTransaction } from "@/lib/queries/useTransactions";
import { useUser } from "@/lib/queries/useUser";

const formSchema = z.object({
  accountId: z.number({
    required_error: "Please select an account",
  }),
  amount: z
    .string()
    .min(1, "Amount is required.")
    .regex(/^-?\d+(\.\d{1,2})?$/, "Invalid number format."),
  currency: z.string().min(1, "Currency is required."),
  description: z.string().min(1, "Description is required."),
  category: z.string().min(1, "Category is required."),
  date: z.string().min(1, "Date is required."),
});

type FormSchema = z.infer<typeof formSchema>;

export function AddTransactionDialog() {
  const { isOpen, close, data: transactionData } = useDialog("addTransaction");
  const { mutate: addTransaction, isPending } = useAddTransaction();
  const { data: accounts } = useAccounts();
  const { data: currencies } = useCurrencies();
  const { data: user } = useUser();

  const manualAccounts = accounts?.filter((account) => !account.institution_connection_id);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountId: undefined,
      amount: "",
      currency: user?.settings.currency ?? "",
      description: "",
      category: "",
      date: new Date().toISOString(),
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (transactionData?.accountId) {
        // Set the Account ID
        form.setValue("accountId", transactionData.accountId);

        // Set the currency based on the selected account
        const account = accounts?.find((a) => a.id === transactionData.accountId);
        if (account) {
          form.setValue("currency", account.currency);
        }
      } else {
        // Reset to undefined when no accountId is provided
        // @ts-ignore
        form.setValue("accountId", undefined);
        // Reset to user's default currency
        if (user?.settings.currency) {
          form.setValue("currency", user.settings.currency);
        }
      }
    }
  }, [isOpen, transactionData?.accountId, accounts, form, user?.settings.currency]);

  useEffect(() => {
    if (user?.settings.currency) {
      form.setValue("currency", user.settings.currency);
    }
  }, [user?.settings.currency, form]);

  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  const handleSubmit = form.handleSubmit((data) => {
    addTransaction({
      account_id: data.accountId,
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      category: data.category,
      date: new Date(data.date).toISOString().split("T")[0]!,
    });

    close();
  });

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>Add a new transaction to your account.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number.parseInt(value))}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {manualAccounts?.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name}
                        </SelectItem>
                      ))}
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
                  <div className="flex gap-2">
                    <FormControl>
                      <Input placeholder="Enter amount" {...field} />
                    </FormControl>
                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field: currencyField }) => (
                        <Select
                          onValueChange={currencyField.onChange}
                          defaultValue={currencyField.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-[100px]">
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

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter category" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <DialogFooter>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Transaction"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
