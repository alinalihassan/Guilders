import { getApiClient } from "@/lib/api";
import type {
  CreateDocumentResponse,
  DocumentEntityType,
} from "@guilders/api/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
      const api = await getApiClient();

      for (const file of files) {
        const response = await api.documents.$post({
          form: {
            entity_id: entityId,
            entity_type: entityType,
            file,
          },
        });
        const { data, error } = await response.json();
        if (error || !data) throw new Error(error);

        uploadedFiles.push(data);
        onSuccess?.(data);
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
      const api = await getApiClient();
      const response = await api.documents.$delete({ json: { id } });
      const { error } = await response.json();
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityType, entityId] });
    },
  });

  const { mutateAsync: getSignedUrl, isPending: isGettingUrl } = useMutation({
    mutationFn: async (id: number) => {
      const api = await getApiClient();
      const response = await api.documents[":id"].$get({
        param: { id: id.toString() },
      });
      const { data, error } = await response.json();
      if (error || !data) throw new Error(error);
      return data.url as string;
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
