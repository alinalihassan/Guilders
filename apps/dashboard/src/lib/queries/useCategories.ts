import type { Category, CategoryInsert } from "@guilders/api/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, edenError } from "../api";

export const queryKey = ["categories"] as const;

export function useCategories() {
  return useQuery({
    queryKey,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await api.category.get();
      if (error) throw new Error(edenError(error));
      return (data ?? []) as Category[];
    },
  });
}

export function useAddCategory() {
  const queryClient = useQueryClient();
  return useMutation<Category, Error, Pick<CategoryInsert, "name">>({
    mutationFn: async (payload) => {
      const { data, error } = await api.category.post(payload);
      if (error) throw new Error(edenError(error));
      return data as Category;
    },
    onError: (error) => {
      console.error("Failed to add category:", error);
      toast.error("Failed to add category", {
        description: "Please try again later",
      });
    },
    onSuccess: (newCategory) => {
      queryClient.setQueryData<Category[]>(queryKey, (old = []) => {
        const exists = old.some((category) => category.id === newCategory.id);
        if (exists) return old;
        return [...old, newCategory].toSorted((a, b) => a.name.localeCompare(b.name));
      });
      toast.success("Category added");
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation<Category, Error, { id: number; category: Pick<CategoryInsert, "name"> }>({
    mutationFn: async ({ id, category }) => {
      const { data, error } = await api.category({ id }).put(category);
      if (error) throw new Error(edenError(error));
      return data as Category;
    },
    onError: (error) => {
      console.error("Failed to update category:", error);
      toast.error("Failed to update category", {
        description: "Please try again later",
      });
    },
    onSuccess: (updatedCategory) => {
      queryClient.setQueryData<Category[]>(queryKey, (old = []) =>
        old
          .map((category) => (category.id === updatedCategory.id ? updatedCategory : category))
          .toSorted((a, b) => a.name.localeCompare(b.name)),
      );
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
    onSuccess: (categoryId) => {
      queryClient.setQueryData<Category[]>(queryKey, (old = []) =>
        old.filter((category) => category.id !== categoryId),
      );
      toast.success("Category deleted");
    },
  });
}
