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

async function handleFileResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 404 || response.status === 501) {
      throw new Error("Document management is not available yet");
    }
    throw new Error(errorData.error || `Error: ${response.status}`);
  }
  return response.json();
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
        const data = await handleFileResponse<CreateDocumentResponse>(response);
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
      await handleFileResponse(response);
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
      const data = await handleFileResponse<{ url: string }>(response);
      return data.url;
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
