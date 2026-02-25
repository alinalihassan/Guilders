import type { CreateDocumentResponse, DocumentEntityType } from "@guilders/api/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api, edenError } from "@/lib/api";

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
        const { data, error } = await (api as Record<string, any>).documents.post({
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
      const { error } = await (api as Record<string, any>).documents.delete({ id });
      if (error) throw new Error(edenError(error));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityType, entityId] });
    },
  });

  const { mutateAsync: getSignedUrl, isPending: isGettingUrl } = useMutation({
    mutationFn: async (id: number) => {
      const { data, error } = await (api as Record<string, any>).documents({ id }).get();
      if (error) throw new Error(edenError(error));
      return (data as { url: string }).url;
    },
  });

  return {
    uploadFile,
    deleteFile,
    getSignedUrl,
    isUploading,
    isDeleting,
    isGettingUrl,
  };
}
