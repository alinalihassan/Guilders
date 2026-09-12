import type { Category, CategoryInsert } from "@guilders/api/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";

import { api, rpcJson } from "../api";
import { buildCategoryTree } from "../utils/category-tree";

export const queryKey = ["categories"] as const;

function categoryClassification(
  value: CategoryInsert["classification"] | undefined,
): "income" | "expense" | undefined {
  if (value === "income" || value === "expense") return value;
  return undefined;
}

export function useCategories() {
  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<Category[]> => rpcJson<Category[]>(await api.category.$get()),
  });
  const categoryTree = useMemo(() => buildCategoryTree(query.data ?? []), [query.data]);
  return { ...query, categoryTree };
}

export function useAddCategory() {
  const queryClient = useQueryClient();
  return useMutation<Category, Error, Partial<CategoryInsert>>({
    mutationFn: async (payload) => {
      const body = {
        name: payload.name ?? "",
        color: payload.color ?? undefined,
        icon: payload.icon ?? undefined,
        parent_id: payload.parent_id ?? undefined,
        classification: categoryClassification(payload.classification),
      };
      return rpcJson<Category>(await api.category.$post({ json: body }));
    },
    onError: (error) => {
      console.error("Failed to add category:", error);
      toast.error("Failed to add category", {
        description: "Please try again later",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Category added");
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation<Category, Error, { id: number; category: Partial<CategoryInsert> }>({
    mutationFn: async ({ id, category }) => {
      const body = {
        name: category.name ?? "",
        color: category.color ?? undefined,
        icon: category.icon ?? undefined,
        parent_id: category.parent_id ?? undefined,
        classification: categoryClassification(category.classification),
      };
      return rpcJson<Category>(
        await api.category[":id"].$put({
          param: { id: String(id) },
          json: body,
        }),
      );
    },
    onError: (error) => {
      console.error("Failed to update category:", error);
      toast.error("Failed to update category", {
        description: "Please try again later",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Category updated");
    },
  });
}

export function useRemoveCategory() {
  const queryClient = useQueryClient();
  return useMutation<number, Error, number>({
    mutationFn: async (categoryId) => {
      await rpcJson(await api.category[":id"].$delete({ param: { id: String(categoryId) } }));
      return categoryId;
    },
    onError: (error) => {
      console.error("Failed to delete category:", error);
      toast.error("Failed to delete category", {
        description: "Please try again later",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Category deleted");
    },
  });
}
