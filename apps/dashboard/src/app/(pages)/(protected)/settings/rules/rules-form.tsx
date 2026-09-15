import type { Rule, RuleInsert } from "@guilders/api/types";
import { ArrowRight, Loader2, Pencil, Play, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import { AccountSelector } from "@/components/common/account-selector";
import { CategoryBadge } from "@/components/common/category-badge";
import { CategorySelector } from "@/components/common/category-selector";
import { TagSelector } from "@/components/common/tag-selector";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/lib/queries/useCategories";
import {
  type RulePreviewResponse,
  useAddRule,
  useApplyRule,
  usePreviewRule,
  useRemoveRule,
  useRules,
  useUpdateRule,
} from "@/lib/queries/useRules";
import { useTags } from "@/lib/queries/useTags";
import { cn } from "@/lib/utils";
import { buildCategoryLookup } from "@/lib/utils/category-tree";

type RuleFormState = {
  payee_enabled: boolean;
  payee_match: "exact" | "contains";
  payee_value: string;
  amount_enabled: boolean;
  amount_kind: "any" | "spending" | "income";
  amount_compare: "lt" | "gt" | "between";
  amount_value: string;
  amount_value_max: string;
  account_ids: number[];
  set_category_id: number | undefined;
  rename_enabled: boolean;
  rename_merchant: string;
  tags_enabled: boolean;
  tag_ids: number[];
};

const emptyForm = (): RuleFormState => ({
  payee_enabled: true,
  payee_match: "contains",
  payee_value: "",
  amount_enabled: false,
  amount_kind: "any",
  amount_compare: "gt",
  amount_value: "",
  amount_value_max: "",
  account_ids: [],
  set_category_id: undefined,
  rename_enabled: false,
  rename_merchant: "",
  tags_enabled: false,
  tag_ids: [],
});

function ruleToForm(rule: Rule): RuleFormState {
  return {
    payee_enabled: rule.payee_enabled,
    payee_match: rule.payee_match ?? "contains",
    payee_value: rule.payee_value ?? "",
    amount_enabled: rule.amount_enabled,
    amount_kind: rule.amount_kind ?? "any",
    amount_compare: rule.amount_compare ?? "gt",
    amount_value: rule.amount_value != null ? String(rule.amount_value) : "",
    amount_value_max: rule.amount_value_max != null ? String(rule.amount_value_max) : "",
    account_ids: (rule.account_ids ?? []).slice(0, 1),
    set_category_id: rule.set_category_id ?? undefined,
    rename_enabled: Boolean(rule.rename_merchant?.trim()),
    rename_merchant: rule.rename_merchant ?? "",
    tags_enabled: (rule.tag_ids?.length ?? 0) > 0,
    tag_ids: rule.tag_ids ?? [],
  };
}

function formToPayload(form: RuleFormState): RuleInsert {
  return {
    enabled: true,
    payee_enabled: form.payee_enabled,
    payee_match: form.payee_enabled ? form.payee_match : null,
    payee_value: form.payee_enabled ? form.payee_value.trim() || null : null,
    amount_enabled: form.amount_enabled,
    amount_kind: form.amount_enabled ? form.amount_kind : null,
    amount_compare: form.amount_enabled ? form.amount_compare : null,
    amount_value: form.amount_enabled && form.amount_value ? form.amount_value : null,
    amount_value_max:
      form.amount_enabled && form.amount_compare === "between" && form.amount_value_max
        ? form.amount_value_max
        : null,
    account_ids: form.account_ids.slice(0, 1),
    set_category_id: form.set_category_id ?? null,
    rename_merchant: form.rename_enabled ? form.rename_merchant.trim() || null : null,
    tag_ids: form.tags_enabled ? form.tag_ids : [],
  };
}

function summarizeRule(rule: Rule, categoryName?: string, tagNames?: string[]): string {
  const whenParts: string[] = [];
  if (rule.payee_enabled && rule.payee_value) {
    whenParts.push(
      `payee ${rule.payee_match === "exact" ? "is" : "contains"} “${rule.payee_value}”`,
    );
  }
  if (rule.amount_enabled) {
    const kind =
      rule.amount_kind === "spending"
        ? "spending"
        : rule.amount_kind === "income"
          ? "income"
          : "amount";
    if (rule.amount_compare === "between") {
      whenParts.push(`${kind} between ${rule.amount_value}–${rule.amount_value_max}`);
    } else if (rule.amount_compare === "lt") {
      whenParts.push(`${kind} < ${rule.amount_value}`);
    } else if (rule.amount_compare === "gt") {
      whenParts.push(`${kind} > ${rule.amount_value}`);
    } else {
      whenParts.push(kind);
    }
  }
  if (rule.account_ids.length > 0) {
    whenParts.push("specific account");
  }

  const thenParts: string[] = [];
  if (categoryName) thenParts.push(`category ${categoryName}`);
  if (rule.rename_merchant) thenParts.push(`rename to “${rule.rename_merchant}”`);
  if (tagNames && tagNames.length > 0) thenParts.push(`tags ${tagNames.join(", ")}`);

  const when = whenParts.length > 0 ? whenParts.join(", ") : "any transaction";
  const then = thenParts.length > 0 ? thenParts.join(", ") : "no actions";
  return `When ${when} → ${then}`;
}

function formatMoney(value: string | number, currency = "EUR") {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(Math.abs(amount));
}

function ChangePair({
  from,
  to,
  fromNode,
  toNode,
}: {
  from?: string | null;
  to?: string | null;
  fromNode?: ReactNode;
  toNode?: ReactNode;
}) {
  if (!to && !toNode) return null;
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-sm">
      <span className="text-muted-foreground min-w-0 truncate">{fromNode ?? from ?? "—"}</span>
      <ArrowRight className="text-muted-foreground size-3.5 shrink-0" />
      <span className="min-w-0 truncate font-medium">{toNode ?? to}</span>
    </div>
  );
}

export function RulesForm() {
  const { data: rules, isLoading, isError, refetch, isFetching } = useRules();
  const {
    data: categories,
    isError: categoriesError,
    refetch: refetchCategories,
    isFetching: isFetchingCategories,
  } = useCategories();
  const {
    data: tags,
    isError: tagsError,
    refetch: refetchTags,
    isFetching: isFetchingTags,
  } = useTags();
  const { mutate: addRule, isPending: isAdding } = useAddRule();
  const { mutate: updateRule, isPending: isUpdating } = useUpdateRule();
  const { mutate: removeRule, isPending: isRemoving } = useRemoveRule();
  const { mutate: previewRule, isPending: isPreviewing } = usePreviewRule();
  const { mutate: applyRule, isPending: isApplying } = useApplyRule();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [form, setForm] = useState<RuleFormState>(emptyForm);
  const [preview, setPreview] = useState<RulePreviewResponse | null>(null);
  const [accountsEnabled, setAccountsEnabled] = useState(false);

  const categoryLookup = buildCategoryLookup(categories ?? []);
  const tagLookup = Object.fromEntries((tags ?? []).map((t) => [t.id, t.name]));
  const selectedCategory =
    form.set_category_id != null ? categoryLookup.get(form.set_category_id) : undefined;
  const selectedTagNames = form.tags_enabled
    ? form.tag_ids.map((id) => tagLookup[id]).filter(Boolean)
    : [];

  const openCreate = () => {
    setEditingRule(null);
    setForm(emptyForm());
    setPreview(null);
    setAccountsEnabled(false);
    setDialogOpen(true);
  };

  const openEdit = (rule: Rule) => {
    setEditingRule(rule);
    setForm(ruleToForm(rule));
    setPreview(null);
    setAccountsEnabled((rule.account_ids?.length ?? 0) > 0);
    setDialogOpen(true);
  };

  const patchForm = <K extends keyof RuleFormState>(key: K, value: RuleFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setPreview(null);
  };

  const handleSave = () => {
    const payload = formToPayload(form);
    if (editingRule) {
      updateRule({ id: editingRule.id, rule: payload }, { onSuccess: () => setDialogOpen(false) });
    } else {
      addRule(payload, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handlePreview = () => {
    previewRule(formToPayload(form), {
      onSuccess: (result) => setPreview(result),
    });
  };

  const isSaving = isAdding || isUpdating;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Rules run on new transactions in order. Apply a rule to update matching existing ones.
        </p>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Rule
        </Button>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))
        ) : isError ? (
          <div className="text-muted-foreground flex flex-col items-center gap-3 py-8 text-center text-sm">
            <p>Couldn’t load rules. The API may be rate-limited — try again in a moment.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                "Retry"
              )}
            </Button>
          </div>
        ) : rules?.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            No rules yet. Create one to automate categorization.
          </div>
        ) : (
          rules?.map((rule) => {
            const categoryName =
              rule.set_category_id != null
                ? categoryLookup.get(rule.set_category_id)?.name
                : undefined;
            const tagNames = rule.tag_ids.map((id) => tagLookup[id]).filter(Boolean) as string[];
            return (
              <div
                key={rule.id}
                className="border-border/60 flex items-start gap-3 rounded-lg border px-3 py-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {categoryName && <Badge variant="outline">{categoryName}</Badge>}
                    {tagNames.map((name) => (
                      <Badge key={name} variant="outline" className="font-normal">
                        {name}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm">{summarizeRule(rule, categoryName, tagNames)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Apply to existing"
                    disabled={isApplying}
                    onClick={() => applyRule(rule.id)}
                  >
                    {isApplying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(rule)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive h-8 w-8"
                        disabled={isRemoving}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Rule</AlertDialogTitle>
                        <AlertDialogDescription>
                          Delete this rule? Existing transactions won’t be changed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => removeRule(rule.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Rule" : "New Rule"}</DialogTitle>
            <DialogDescription>
              Rules run in order on every synced transaction: the first rule to set a category or
              name wins, tags add up.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-1">
            <div className="grid gap-4 md:grid-cols-2">
              <section className="space-y-3">
                <h4 className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">
                  When
                </h4>

                <div className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="payee-enabled"
                      checked={form.payee_enabled}
                      onCheckedChange={(checked) => patchForm("payee_enabled", checked === true)}
                    />
                    <Label htmlFor="payee-enabled">Payee</Label>
                  </div>
                  {form.payee_enabled && (
                    <div className="space-y-2">
                      <div
                        role="radiogroup"
                        aria-label="Payee match"
                        className="bg-muted/70 flex items-center rounded-full p-0.5"
                      >
                        {(
                          [
                            ["contains", "Contains"],
                            ["exact", "Is exactly"],
                          ] as const
                        ).map(([value, label]) => {
                          const selected = form.payee_match === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              className={cn(
                                "flex-1 rounded-full px-3 py-1.5 text-xs font-medium tracking-wide transition-colors",
                                selected
                                  ? "bg-foreground text-background"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                              onClick={() => patchForm("payee_match", value)}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      <Input
                        value={form.payee_value}
                        onChange={(e) => patchForm("payee_value", e.target.value)}
                        placeholder="Merchant or description"
                      />
                      <p className="text-muted-foreground text-xs">
                        Matched against the bank&apos;s original name and the current name, ignoring
                        case.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="amount-enabled"
                      checked={form.amount_enabled}
                      onCheckedChange={(checked) => patchForm("amount_enabled", checked === true)}
                    />
                    <Label htmlFor="amount-enabled">Amount</Label>
                  </div>
                  {form.amount_enabled && (
                    <div className="grid gap-2">
                      <Select
                        value={form.amount_kind}
                        onValueChange={(value: "any" | "spending" | "income") =>
                          patchForm("amount_kind", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any</SelectItem>
                          <SelectItem value="spending">Spending</SelectItem>
                          <SelectItem value="income">Income</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={form.amount_compare}
                          onValueChange={(value: "lt" | "gt" | "between") =>
                            patchForm("amount_compare", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gt">Greater than</SelectItem>
                            <SelectItem value="lt">Less than</SelectItem>
                            <SelectItem value="between">Between</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          value={form.amount_value}
                          onChange={(e) => patchForm("amount_value", e.target.value)}
                          placeholder="Amount"
                        />
                      </div>
                      {form.amount_compare === "between" && (
                        <Input
                          value={form.amount_value_max}
                          onChange={(e) => patchForm("amount_value_max", e.target.value)}
                          placeholder="Max amount"
                        />
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="accounts-enabled"
                      checked={accountsEnabled}
                      onCheckedChange={(checked) => {
                        const enabled = checked === true;
                        setAccountsEnabled(enabled);
                        if (!enabled) patchForm("account_ids", []);
                        else setPreview(null);
                      }}
                    />
                    <Label htmlFor="accounts-enabled">Account</Label>
                  </div>
                  {accountsEnabled && (
                    <div className="space-y-2">
                      <AccountSelector
                        value={form.account_ids[0]}
                        onChange={(accountId) => patchForm("account_ids", [accountId])}
                        placeholder="Select account"
                      />
                      <p className="text-muted-foreground text-xs">
                        When enabled, the rule only matches this one account. Leave unchecked to
                        match all accounts.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">
                  Then
                </h4>

                {(categoriesError || tagsError) && (
                  <div className="text-muted-foreground rounded-lg border border-dashed px-3 py-2 text-xs">
                    Couldn’t load{" "}
                    {categoriesError && tagsError
                      ? "categories and tags"
                      : categoriesError
                        ? "categories"
                        : "tags"}
                    .{" "}
                    <button
                      type="button"
                      className="text-foreground underline underline-offset-2"
                      onClick={() => {
                        if (categoriesError) void refetchCategories();
                        if (tagsError) void refetchTags();
                      }}
                      disabled={isFetchingCategories || isFetchingTags}
                    >
                      Retry
                    </button>
                  </div>
                )}

                <div className="space-y-2 rounded-lg border p-3">
                  <Label>Set category</Label>
                  <CategorySelector
                    value={form.set_category_id}
                    onChange={(value) => patchForm("set_category_id", value)}
                    placeholder="Optional category"
                    allowClear
                  />
                </div>

                <div className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="tags-enabled"
                      checked={form.tags_enabled}
                      onCheckedChange={(checked) => {
                        const enabled = checked === true;
                        patchForm("tags_enabled", enabled);
                        if (!enabled) patchForm("tag_ids", []);
                      }}
                    />
                    <Label htmlFor="tags-enabled">Add tags</Label>
                  </div>
                  {form.tags_enabled && (
                    <TagSelector
                      value={form.tag_ids}
                      onChange={(tag_ids) => patchForm("tag_ids", tag_ids)}
                      placeholder="Select tags"
                    />
                  )}
                </div>

                <div className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="rename-enabled"
                      checked={form.rename_enabled}
                      onCheckedChange={(checked) => {
                        const enabled = checked === true;
                        patchForm("rename_enabled", enabled);
                        if (!enabled) patchForm("rename_merchant", "");
                      }}
                    />
                    <Label htmlFor="rename-enabled">Rename payee</Label>
                  </div>
                  {form.rename_enabled && (
                    <Input
                      value={form.rename_merchant}
                      onChange={(e) => patchForm("rename_merchant", e.target.value)}
                      placeholder="New merchant name"
                    />
                  )}
                </div>
              </section>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              {editingRule && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isApplying}
                  onClick={() => applyRule(editingRule.id)}
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    "Apply to existing"
                  )}
                </Button>
              )}
              <Button type="button" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingRule ? (
                  "Save Rule"
                ) : (
                  "Create Rule"
                )}
              </Button>
            </div>

            <section className="space-y-3 border-t pt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <h4 className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">
                    Preview
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Checks your existing transactions. Rules only change new synced transactions;
                    nothing is changed here.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={handlePreview}
                  disabled={isPreviewing}
                >
                  {isPreviewing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 h-4 w-4" />
                  )}
                  Preview matches
                </Button>
              </div>

              {preview != null && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {preview.count === 1
                      ? "1 existing transaction matches"
                      : `${preview.count} existing transactions match`}
                  </p>
                  {preview.samples.length > 0 ? (
                    <div className="border-border/60 divide-y overflow-hidden rounded-lg border">
                      {preview.samples.map((sample) => {
                        const currentName =
                          sample.merchant_name?.trim() || sample.description?.trim() || "Unknown";
                        const currentCategory =
                          sample.category_id != null
                            ? categoryLookup.get(sample.category_id)
                            : undefined;
                        const renameTo =
                          form.rename_enabled && form.rename_merchant.trim()
                            ? form.rename_merchant.trim()
                            : null;
                        const nextCategory = selectedCategory;
                        const amount = Number(sample.amount);

                        return (
                          <div
                            key={sample.id}
                            className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{currentName}</p>
                              <p
                                className={cn(
                                  "font-mono text-xs tabular-nums",
                                  amount > 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : amount < 0
                                      ? "text-red-600 dark:text-red-400"
                                      : "text-muted-foreground",
                                )}
                              >
                                {amount < 0 ? "−" : amount > 0 ? "+" : ""}
                                {formatMoney(sample.amount)}
                              </p>
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col items-stretch gap-1 sm:items-end">
                              {renameTo && <ChangePair from={currentName} to={renameTo} />}
                              {nextCategory && (
                                <ChangePair
                                  fromNode={
                                    currentCategory ? (
                                      <CategoryBadge category={currentCategory} />
                                    ) : (
                                      <span className="text-muted-foreground">Uncategorized</span>
                                    )
                                  }
                                  toNode={<CategoryBadge category={nextCategory} />}
                                />
                              )}
                              {selectedTagNames.length > 0 && (
                                <div className="flex flex-wrap gap-1 sm:justify-end">
                                  {selectedTagNames.map((name) => (
                                    <Badge key={name} variant="secondary" className="font-normal">
                                      +{name}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {!renameTo && !nextCategory && selectedTagNames.length === 0 && (
                                <span className="text-muted-foreground text-xs">
                                  No actions set
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : preview.count > 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Matches found, but none are shown in this sample.
                    </p>
                  ) : null}
                </div>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
