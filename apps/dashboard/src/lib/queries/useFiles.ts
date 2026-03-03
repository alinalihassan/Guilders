import type { CreateDocumentResponse, DocumentEntityType } from "@guilders/api/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api, edenError } from "@/lib/api";
import { env } from "@/lib/env";

interface UseFilesOptions {
  entityType: DocumentEntityType;
  entityId: number;
  onSuccess?: (file: CreateDocumentResponse) => void;
}

export function useFiles({ entityType, entityId, onSuccess }: UseFilesOptions) {
  const queryClient = useQueryClient();

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityType, entityId] });
    },
    onError: (error) => {
      console.error("Error uploading file", error);
    },
  });

  const { mutateAsync: deleteFile, isPending: isDeleting } = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await api.document({ id }).delete();
      if (error) throw new Error(edenError(error));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityType, entityId] });
    },
  });

  function getFileUrl(id: number): string {
    return `${env.NEXT_PUBLIC_API_URL}/api/document/${id}/file`;
  }

  return {
    uploadFile,
    deleteFile,
    getFileUrl,
    isUploading,
    isDeleting,
  };
}
