"use client";

import type { CreateDocumentResponse } from "@guilders/api/types";
import { Loader2, Upload, X } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import Dropzone, { type DropEvent, type DropzoneProps, type FileRejection } from "react-dropzone";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useControllableState } from "@/hooks/useControllableState";
import { cn, formatBytes } from "@/lib/utils";

interface FileUploaderProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: File[];
  onValueChange?: (files: File[]) => void;
  onUpload?: (files: File[]) => Promise<CreateDocumentResponse[]>;
  accept?: DropzoneProps["accept"];
  maxSize?: number;
  maxFileCount?: number;
  multiple?: boolean;
  disabled?: boolean;
  documents?: Array<{ id: number; name: string; path: string }>;
  onRemoveExisting?: (id: number) => Promise<void>;
  onView?: (id: number) => Promise<string>;
}

export function FileUploader({
  value: valueProp,
  onValueChange,
  onUpload,
  accept = { "image/*": [] },
  maxSize = 1024 * 1024 * 2,
  maxFileCount = 1,
  multiple = false,
  disabled = false,
  documents = [],
  onRemoveExisting,
  onView,
  className,
  ...dropzoneProps
}: FileUploaderProps) {
  const [files, setFiles] = useControllableState({
    prop: valueProp,
    onChange: onValueChange,
  });

  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});

  const handleUpload = React.useCallback(
    async (newFiles: File[]) => {
      if (!onUpload) return;

      const uploading = newFiles.reduce(
        (acc, file) => ({ ...acc, [file.name]: true }),
        {} as Record<string, boolean>,
      );
      setUploadingFiles(uploading);

      try {
        await onUpload(newFiles);
        setFiles([]);
        toast.success("Upload complete");
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload files");
      } finally {
        setUploadingFiles({});
      }
    },
    [onUpload, setFiles],
  );

  const onDrop = React.useCallback(
    (acceptedFiles: File[], _rejectedFiles: FileRejection[], _: DropEvent) => {
      if (!multiple && maxFileCount === 1 && acceptedFiles.length > 1) {
        toast.error("Cannot upload more than 1 file at a time");
        return;
      }

      if ((files?.length ?? 0) + acceptedFiles.length > maxFileCount) {
        toast.error(`Cannot upload more than ${maxFileCount} files`);
        return;
      }

      const newFiles = acceptedFiles.map((file) =>
        Object.assign(file, { preview: URL.createObjectURL(file) }),
      );

      setFiles(newFiles);

      if (newFiles.length > 0) {
        handleUpload(newFiles);
      }
    },
    [files, maxFileCount, multiple, setFiles, handleUpload],
  );

  const onRemove = async (index: number) => {
    if (!files) return;
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onValueChange?.(newFiles);
  };

  const handleRemoveExisting = async (id: number) => {
    if (!onRemoveExisting) return;

    try {
      await onRemoveExisting(id);
      toast.success("File removed");
    } catch (error) {
      toast.error("Failed to remove file");
      throw error;
    }
  };

  const isDisabled = disabled || (files?.length ?? 0 + documents.length) >= maxFileCount;

  return (
    <div className="relative flex flex-col gap-6 overflow-hidden">
      <Dropzone
        // @ts-ignore
        onDrop={onDrop}
        accept={accept}
        maxSize={maxSize}
        maxFiles={maxFileCount - documents.length}
        multiple={maxFileCount > 1 || multiple}
        disabled={isDisabled}
        {...dropzoneProps}
      >
        {({ getRootProps, getInputProps, isDragActive }) => (
          <div
            {...getRootProps()}
            className={cn(
              "group relative grid h-52 w-full cursor-pointer place-items-center rounded-lg border-2 border-dashed border-muted-foreground/25 px-5 py-2.5 text-center transition hover:bg-muted/25",
              "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isDragActive && "border-muted-foreground/50",
              isDisabled && "pointer-events-none opacity-60",
              className,
            )}
          >
            <input {...getInputProps()} />
            <DropzoneContent
              isDragActive={isDragActive}
              maxSize={maxSize}
              maxFileCount={maxFileCount}
            />
          </div>
        )}
      </Dropzone>

      {((files?.length ?? 0) > 0 || documents.length > 0) && (
        <ScrollArea className="h-fit w-full px-3">
          <div className="flex max-h-48 flex-col gap-4">
            {documents.map((doc) => (
              <FileCard
                key={doc.id}
                file={{
                  name: doc.name,
                  size: 0,
                  type: doc.path.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/*",
                }}
                documentId={doc.id}
                onRemove={() => handleRemoveExisting(doc.id)}
                onView={onView}
              />
            ))}
            {files?.map((file, index) => (
              <FileCard
                key={file.name}
                file={file}
                onRemove={() => onRemove(index)}
                isUploading={uploadingFiles[file.name]}
                onView={onView}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function DropzoneContent({
  isDragActive,
  maxSize,
  maxFileCount,
}: {
  isDragActive: boolean;
  maxSize: number;
  maxFileCount: number;
}) {
  if (isDragActive) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 sm:px-5">
        <div className="rounded-full border border-dashed p-3">
          <Upload className="size-7 text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="font-medium text-muted-foreground">Drop the files here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 sm:px-5">
      <div className="rounded-full border border-dashed p-3">
        <Upload className="size-7 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-px">
        <p className="font-medium text-muted-foreground">
          Drag and drop files here, or click to select files
        </p>
        <p className="text-sm text-muted-foreground/70">
          You can upload
          {maxFileCount > 1
            ? ` ${maxFileCount === Number.POSITIVE_INFINITY ? "multiple" : maxFileCount}
            files (up to ${formatBytes(maxSize)} each)`
            : ` a file with ${formatBytes(maxSize)}`}
        </p>
      </div>
    </div>
  );
}

interface FileCardProps {
  file: File | { name: string; size: number; type: string };
  documentId?: number;
  onRemove: () => Promise<void>;
  onView?: (id: number) => Promise<string>;
  isUploading?: boolean;
}

function FileCard({ file, documentId, isUploading, onRemove, onView }: FileCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleView = async () => {
    if (!documentId || !onView) return;

    setIsLoading(true);
    try {
      const url = await onView(documentId);
      window.open(url, "_blank");
    } catch (error) {
      toast.error("Failed to open document");
      console.error("Error opening document:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await onRemove();
    } catch (error) {
      console.error("Error removing file:", error);
      toast.error("Failed to remove file");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="relative flex items-center gap-2.5">
      <div className="flex flex-1 gap-2.5">
        <div className="flex w-full flex-col gap-2">
          <div className="flex flex-col gap-px">
            <p className="line-clamp-1 text-sm font-medium text-foreground/80">{file.name}</p>
            {"size" in file && file.size > 0 && (
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {documentId && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary/90"
            disabled={isLoading}
            onClick={handleView}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "View"}
          </Button>
        )}
        {isUploading ? (
          <div className="grid size-7 place-items-center">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-7"
            onClick={handleRemove}
            disabled={isRemoving}
          >
            {isRemoving ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
            <span className="sr-only">Remove file</span>
          </Button>
        )}
      </div>
    </div>
  );
}
