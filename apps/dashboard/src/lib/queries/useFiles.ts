import type { CreateDocumentResponse, DocumentEntityType } from "@guilders/api/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, edenError } from "@/lib/api";
import { clientEnv } from "@/lib/env";

interface UseFilesOptions {
  entityType: DocumentEntityType;
  entityId: number;
  onSuccess?: (file: CreateDocumentResponse) => void;
}

export function useFiles({ entityType, entityId, onSuccess }: UseFilesOptions) {
  const queryClient = useQueryClient();

  const queryKey = ["documents", entityType, entityId];

  const { data: documents = [], isLoading: isLoadingDocuments } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!entityId) return [];
      const { data, error } = await api.document.get({
        query: { entity_type: entityType, entity_id: entityId },
      });
      if (error) throw new Error(edenError(error));
      return (data ?? []) as CreateDocumentResponse[];
    },
    enabled: entityId > 0,
  });

  const { mutateAsync: uploadFile, isPending: isUploading } = useMutation({
    mutationFn: async (files: File[]) => {
      const uploadedFiles: CreateDocumentResponse[] = [];

      for (const file of files) {
        const { data, error } = await api.document.post({
          entity_id: entityId,
          entity_type: entityType,
          file,
        });
        if (error) throw new Error(edenError(error));
        uploadedFiles.push(data as CreateDocumentResponse);
        onSuccess?.(data as CreateDocumentResponse);
      }

      return uploadedFiles;
    },
    onSuccess: (newDocs) => {
      queryClient.setQueryData<CreateDocumentResponse[]>(queryKey, (old = []) => [
        ...old,
        ...newDocs,
      ]);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      console.error("Error uploading file", error);
    },
  });

  const { mutateAsync: deleteFile, isPending: isDeleting } = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await api.document({ id }).delete();
      if (error) throw new Error(edenError(error));
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<CreateDocumentResponse[]>(queryKey, (old = []) =>
        old.filter((doc) => doc.id !== deletedId),
      );
      queryClient.invalidateQueries({ queryKey });
    },
  });

  function getFileUrl(id: number): string {
    return `${clientEnv.VITE_API_URL}/api/document/${id}/file`;
  }

  return {
    documents,
    isLoadingDocuments,
    uploadFile,
    deleteFile,
    getFileUrl,
    isUploading,
    isDeleting,
  };
}
