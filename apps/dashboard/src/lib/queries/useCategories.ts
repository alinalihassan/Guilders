import type { Category, CategoryInsert, CategoryTree } from "@guilders/api/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";

import { api, edenError } from "../api";
import { buildCategoryTree } from "../utils/category-tree";

export const queryKey = ["categories"] as const;

export function useCategories() {
  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await api.category.get();
      if (error) throw new Error(edenError(error));
      return (data ?? []) as Category[];
    },
  });
  const categoryTree = useMemo(
    () => buildCategoryTree(query.data ?? []),
    [query.data],
  );
  return { ...query, categoryTree };
}

export function useAddCategory() {
  const queryClient = useQueryClient();
  return useMutation<Category, Error, Partial<CategoryInsert>>({
    mutationFn: async (payload) => {
      const body = {
        ...payload,
        color: payload.color ?? undefined,
        icon: payload.icon ?? undefined,
        parent_id: payload.parent_id ?? undefined,
      };
      const { data, error } = await api.category.post(body);
      if (error) throw new Error(edenError(error));
      return data as Category;
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
        ...category,
        color: category.color ?? undefined,
        icon: category.icon ?? undefined,
        parent_id: category.parent_id ?? undefined,
      };
      const { data, error } = await api.category({ id }).put(body);
      if (error) throw new Error(edenError(error));
      return data as Category;
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
      const { error } = await api.category({ id: categoryId }).delete();
      if (error) throw new Error(edenError(error));
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
