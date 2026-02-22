"use client";

import {
  accountSubtypeLabels,
  accountSubtypes,
} from "@/lib/account-types";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useDialog } from "../../lib/hooks/useDialog";
import { useAddAccount } from "../../lib/queries/useAccounts";
import { useCurrencies } from "../../lib/queries/useCurrencies";
import { useUser } from "../../lib/queries/useUser";

const formSchema = z.object({
  accountType: z.enum(accountSubtypes),
  accountName: z.string().min(1, "Account name is required."),
  value: z
    .string()
    .min(1, "Value is required.")
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid number format."),
  currency: z.string(),
});

type FormSchema = z.infer<typeof formSchema>;

export function AddAccountDialog() {
  const { isOpen, close } = useDialog("addManualAccount");
  const [isLoading, setIsLoading] = useState(false);
  const { data: user } = useUser();
  const { mutate: addAccount } = useAddAccount();
  const {
    data: currencies,
    isLoading: isCurrenciesLoading,
    error: currenciesError,
  } = useCurrencies();

  if (currenciesError) {
    toast.error("Error loading currencies", {
      description: "Unable to load currency options. Please try again later.",
    });
  }

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountType: undefined,
      accountName: "",
      value: "",
      currency: user?.settings.currency ?? "",
    },
  });

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

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsLoading(true);

    try {
      await addAccount({
        type:
          data.accountType === "creditcard" || data.accountType === "loan"
            ? "liability"
            : "asset",
        name: data.accountName,
        subtype: data.accountType,
        value: Number.parseFloat(data.value),
        currency: data.currency,
      });

      close();
    } catch (error) {
      console.error("Error adding account:", error);
    } finally {
      setIsLoading(false);
    }
  });

  const customOrder = ["USD", "GBP", "EUR"];
  const sortedCurrencies = useMemo(() => {
    if (!currencies) return [];

    const orderedCurrencies = customOrder
      .map((code) => currencies.find((c) => c.code === code))
      .filter((c): c is NonNullable<typeof c> => c !== undefined);

    const remainingCurrencies = currencies
      .filter((c) => !customOrder.includes(c.code))
      .sort((a, b) => a.code.localeCompare(b.code));

    return [...orderedCurrencies, ...remainingCurrencies];
  }, [currencies]);

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add Account</DialogTitle>
          <DialogDescription>
            Enter the details of the new account you want to add.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="accountType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
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
            <FormField
              control={form.control}
              name="accountName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter account name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Value</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input type="text" placeholder="Enter value" {...field} />
                    </FormControl>
                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isCurrenciesLoading || !currencies}
                        >
                          <FormControl>
                            <SelectTrigger className="w-[100px]">
                              <SelectValue
                                placeholder={
                                  isCurrenciesLoading
                                    ? "Loading..."
                                    : "Currency"
                                }
                                defaultValue={user?.settings.currency ?? ""}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sortedCurrencies.map((currency) => (
                              <SelectItem
                                key={currency.code}
                                value={currency.code}
                              >
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
            <DialogFooter>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Account"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
