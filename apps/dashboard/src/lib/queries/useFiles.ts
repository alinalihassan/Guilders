import type { CreateDocumentResponse, DocumentEntityType } from "@guilders/api/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, rpcJson } from "@/lib/api";
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
      return rpcJson<CreateDocumentResponse[]>(
        await api.document.$get({
          query: { entity_type: entityType, entity_id: String(entityId) },
        }),
      );
    },
    enabled: entityId > 0,
  });

  const { mutateAsync: uploadFile, isPending: isUploading } = useMutation({
    mutationFn: async (files: File[]) => {
      const uploadedFiles: CreateDocumentResponse[] = [];

      for (const file of files) {
        const data = await rpcJson<CreateDocumentResponse>(
          await api.document.$post({
            form: {
              entity_id: String(entityId),
              entity_type: entityType,
              file,
            },
          }),
        );
        uploadedFiles.push(data);
        onSuccess?.(data);
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
      await rpcJson(await api.document[":id"].$delete({ param: { id: String(id) } }));
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
