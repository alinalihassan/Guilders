import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  url: string;
  type: string;
}

interface UseAccountFilesOptions {
  accountId: number;
  onSuccess?: (file: UploadedFile) => void;
}

export function useAccountFiles({
  accountId,
  onSuccess,
}: UseAccountFilesOptions) {
  const queryClient = useQueryClient();

  const { mutateAsync: uploadFile, isPending: isUploading } = useMutation({
    mutationFn: async (files: File[]) => {
      const uploadedFiles: string[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`/api/accounts/${accountId}/documents`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to upload file");
        }

        const data = await response.json();
        uploadedFiles.push(data.file.url);
        onSuccess?.(data.file);
      }

      return uploadedFiles;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", accountId] });
    },
  });

  const { mutateAsync: deleteFile, isPending: isDeleting } = useMutation({
    mutationFn: async (path: string) => {
      const response = await fetch(`/api/accounts/${accountId}/documents`, {
        method: "DELETE",
        body: JSON.stringify({ path }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        console.log(error);
        throw new Error(error.error || "Failed to delete file");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", accountId] });
    },
  });

  const { mutateAsync: getSignedUrl, isPending: isGettingUrl } = useMutation({
    mutationFn: async (path: string) => {
      const response = await fetch(
        `/api/accounts/${accountId}/documents/${encodeURIComponent(path)}`,
        {
          method: "GET",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get signed URL");
      }

      const data = await response.json();
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
