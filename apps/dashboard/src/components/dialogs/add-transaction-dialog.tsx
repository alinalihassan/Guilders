"use client";

import type { Currency } from "@guilders/api/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AccountSelector } from "@/components/common/account-selector";
import { CategorySelector } from "@/components/common/category-selector";
import { DatePicker } from "@/components/common/date-picker";
import { TimePicker } from "@/components/common/time-picker";
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
  categoryId: z.number({
    required_error: "Category is required.",
  }),
  timestamp: z.date(),
});

type FormSchema = z.infer<typeof formSchema>;

export function AddTransactionDialog() {
  const { isOpen, close, data: transactionData } = useDialog("addTransaction");
  const { mutate: addTransaction, isPending } = useAddTransaction();
  const { data: accounts } = useAccounts();
  const { data: currencies } = useCurrencies();
  const { data: user } = useUser();
  const currencyOptions = (currencies ?? []) as Currency[];

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountId: undefined,
      amount: "",
      currency: user?.currency ?? "",
      description: "",
      categoryId: undefined,
      timestamp: new Date(),
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.setValue("timestamp", new Date());
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
        if (user?.currency) {
          form.setValue("currency", user.currency);
        }
      }
    }
  }, [isOpen, transactionData?.accountId, accounts, form, user?.currency]);

  useEffect(() => {
    if (user?.currency) {
      form.setValue("currency", user.currency);
    }
  }, [user?.currency, form]);

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
      category_id: data.categoryId,
      timestamp: data.timestamp.toISOString() as unknown as Date,
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
                  <FormControl>
                    <AccountSelector
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select account"
                      hideTrackedAccounts
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
                            {currencyOptions.map((currency) => (
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
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <CategorySelector
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select or add category"
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <FormLabel>Date</FormLabel>
                        <DatePicker
                          date={field.value}
                          onDateChange={field.onChange}
                          preserveTime={true}
                        />
                      </div>
                      <div className="space-y-2">
                        <FormLabel>Time</FormLabel>
                        <TimePicker date={field.value} onDateChange={field.onChange} />
                      </div>
                    </div>
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
