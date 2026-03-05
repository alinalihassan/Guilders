"use client";

import type { CreateDocumentResponse } from "@guilders/api/types";
import { FileText, Loader2, Upload, X } from "lucide-react";
import dynamic from "next/dynamic";
import * as React from "react";
import { useState } from "react";
import Dropzone, { type DropEvent, type DropzoneProps, type FileRejection } from "react-dropzone";
import { toast } from "sonner";

import { DocumentPreviewDialog } from "@/components/common/document-preview-dialog";
import { Button } from "@/components/ui/button";
import { useControllableState } from "@/hooks/useControllableState";
import { cn, formatBytes } from "@/lib/utils";

const PdfThumbnail = dynamic(
  () => import("./pdf-thumbnail").then((mod) => ({ default: mod.PdfThumbnail })),
  {
    ssr: false,
    loading: () => (
      <div className="flex size-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

export interface DocumentRecord {
  id: number;
  name: string;
  type: string;
  size: number;
  path: string;
}

interface FileUploaderProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: File[];
  onValueChange?: (files: File[]) => void;
  onUpload?: (files: File[]) => Promise<CreateDocumentResponse[]>;
  accept?: DropzoneProps["accept"];
  maxSize?: number;
  maxFileCount?: number;
  multiple?: boolean;
  disabled?: boolean;
  documents?: DocumentRecord[];
  isLoadingDocuments?: boolean;
  onRemoveExisting?: (id: number) => Promise<void>;
  getFileUrl?: (id: number) => string;
}

const DEFAULT_ACCEPT: DropzoneProps["accept"] = {
  "image/jpeg": [],
  "image/png": [],
  "image/webp": [],
  "image/heic": [],
  "application/pdf": [],
};

const MAX_SIZE = 10 * 1024 * 1024;

/** File with a stable unique id for upload state and React keys (avoids collisions when names duplicate). */
type UploadableFile = File & { __uploadId: string };

export function FileUploader({
  value: valueProp,
  onValueChange,
  onUpload,
  accept = DEFAULT_ACCEPT,
  maxSize = MAX_SIZE,
  maxFileCount = 10,
  multiple = true,
  disabled = false,
  documents = [],
  isLoadingDocuments = false,
  onRemoveExisting,
  getFileUrl,
  className,
  ...dropzoneProps
}: FileUploaderProps) {
  const [files, setFiles] = useControllableState({
    prop: valueProp,
    onChange: onValueChange,
  });

  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [previewDocument, setPreviewDocument] = useState<DocumentRecord | null>(null);

  const handleUpload = React.useCallback(
    async (newFiles: UploadableFile[]) => {
      if (!onUpload) return;

      setUploadingFiles(new Set(newFiles.map((f) => f.__uploadId)));

      try {
        await onUpload(newFiles);
        setFiles([]);
        toast.success("Upload complete");
      } catch (error) {
        setFiles([]);
        const message = error instanceof Error ? error.message : "Failed to upload files";
        const isUnsupportedType = message.includes("Expected kind 'File'");
        toast.error(
          isUnsupportedType
            ? "This file type isn't supported. Please use JPEG, PNG, WebP, HEIC, or PDF."
            : message,
        );
      } finally {
        setUploadingFiles(new Set());
      }
    },
    [onUpload, setFiles],
  );

  const onDrop = React.useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[], _: DropEvent) => {
      if (rejectedFiles.length > 0) {
        const firstError = rejectedFiles[0]?.errors[0];
        if (firstError?.code === "file-too-large") {
          toast.error(`File exceeds the ${formatBytes(maxSize)} limit`);
        } else if (firstError?.code === "file-invalid-type") {
          toast.error("File type not supported");
        } else {
          toast.error(firstError?.message ?? "File rejected");
        }
        return;
      }

      if (!multiple && maxFileCount === 1 && acceptedFiles.length > 1) {
        toast.error("Cannot upload more than 1 file at a time");
        return;
      }

      const totalCount = (files?.length ?? 0) + documents.length + acceptedFiles.length;
      if (totalCount > maxFileCount) {
        toast.error(`Cannot upload more than ${maxFileCount} files`);
        return;
      }

      const newFiles: UploadableFile[] = acceptedFiles.map((file) =>
        Object.assign(file, { __uploadId: crypto.randomUUID() }),
      );

      setFiles(newFiles);

      if (newFiles.length > 0) {
        handleUpload(newFiles);
      }
    },
    [files, documents.length, maxFileCount, maxSize, multiple, setFiles, handleUpload],
  );

  const removeFileById = (id: string) => {
    if (!files) return;
    const newFiles = files.filter((f) => (f as UploadableFile).__uploadId !== id);
    setFiles(newFiles);
    onValueChange?.(newFiles);
  };

  const removeFileByIndex = (index: number) => {
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
    } catch {
      toast.error("Failed to remove file");
    }
  };

  const isDisabled = disabled || (files?.length ?? 0) + documents.length >= maxFileCount;
  const hasItems = (files?.length ?? 0) > 0 || documents.length > 0 || isLoadingDocuments;

  return (
    <div className="relative flex flex-col gap-4 overflow-hidden">
      {hasItems && (
        <div className="grid grid-cols-3 gap-2">
          {documents.map((doc) => (
            <ExistingDocumentTile
              key={doc.id}
              document={doc}
              fileUrl={getFileUrl?.(doc.id)}
              onPreview={getFileUrl ? () => setPreviewDocument(doc) : undefined}
              onRemove={() => handleRemoveExisting(doc.id)}
            />
          ))}
          {files?.map((file, index) => {
            const uploadable = file as UploadableFile;
            const id = uploadable.__uploadId;
            return (
              <UploadingFileTile
                key={id ?? `${file.name}-${index}`}
                file={file}
                isUploading={id ? uploadingFiles.has(id) : false}
                onRemove={id ? () => removeFileById(id) : () => removeFileByIndex(index)}
              />
            );
          })}
          {isLoadingDocuments && documents.length === 0 && (
            <div className="col-span-3 flex items-center justify-center py-4">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}

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
              "group relative grid w-full cursor-pointer place-items-center rounded-lg border-2 border-dashed border-muted-foreground/25 px-5 py-6 text-center transition hover:bg-muted/25",
              "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isDragActive && "border-primary/50 bg-primary/5",
              isDisabled && "pointer-events-none opacity-60",
              hasItems && "py-4",
              className,
            )}
          >
            <input {...getInputProps()} />
            <DropzoneContent isDragActive={isDragActive} maxSize={maxSize} compact={hasItems} />
          </div>
        )}
      </Dropzone>

      {previewDocument && getFileUrl && (
        <DocumentPreviewDialog
          open={!!previewDocument}
          onOpenChange={(open) => !open && setPreviewDocument(null)}
          name={previewDocument.name}
          type={previewDocument.type}
          fileUrl={getFileUrl(previewDocument.id)}
        />
      )}
    </div>
  );
}

function DropzoneContent({
  isDragActive,
  maxSize,
  compact,
}: {
  isDragActive: boolean;
  maxSize: number;
  compact: boolean;
}) {
  if (isDragActive) {
    return (
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="rounded-full border border-dashed border-primary/50 p-2">
          <Upload className="size-5 text-primary" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-primary">Drop files here</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Upload className="size-4 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Add more files</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="rounded-full border border-dashed p-3">
        <Upload className="size-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-px">
        <p className="text-sm font-medium text-muted-foreground">
          Drag and drop files, or click to browse
        </p>
        <p className="text-xs text-muted-foreground/70">
          PDF, JPEG, PNG, WebP, HEIC up to {formatBytes(maxSize)}
        </p>
      </div>
    </div>
  );
}

interface ExistingDocumentTileProps {
  document: DocumentRecord;
  fileUrl?: string;
  onPreview?: () => void;
  onRemove: () => void;
}

function ExistingDocumentTile({
  document,
  fileUrl,
  onPreview,
  onRemove,
}: ExistingDocumentTileProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const isImage = document.type.startsWith("image/");
  const isPdf = document.type === "application/pdf";

  const handleView = () => {
    if (onPreview) onPreview();
    else if (fileUrl) window.open(fileUrl, "_blank", "noopener,noreferrer");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleView();
    }
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRemoving(true);
    try {
      await onRemove();
    } catch {
      // handled by parent
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-muted/30 transition hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={handleView}
      onKeyDown={handleKeyDown}
      aria-label={`View ${document.name}`}
    >
      <div className="relative aspect-square w-full overflow-hidden">
        {isImage && fileUrl ? (
          // oxlint-disable-next-line nextjs/no-img-element
          <img src={fileUrl} alt={document.name} className="size-full object-cover" />
        ) : isPdf && fileUrl ? (
          <div className="flex size-full items-center justify-center overflow-hidden bg-muted">
            <PdfThumbnail file={fileUrl} width={200} className="relative" />
          </div>
        ) : (
          <div className="flex size-full items-center justify-center bg-muted">
            <FileText className="size-10 text-red-500/70" />
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute right-1 top-1 size-6 opacity-0 shadow-sm transition group-hover:opacity-100"
          onClick={handleRemove}
          disabled={isRemoving}
          aria-label={isRemoving ? `Removing ${document.name}` : `Remove file ${document.name}`}
        >
          {isRemoving ? (
            <Loader2 className="size-3 animate-spin" aria-hidden />
          ) : (
            <X className="size-3" aria-hidden />
          )}
        </Button>
      </div>

      <div className="px-2 py-1.5">
        <p className="truncate text-xs font-medium">{document.name}</p>
        <p className="text-[10px] text-muted-foreground">{formatBytes(document.size)}</p>
      </div>
    </div>
  );
}

interface UploadingFileTileProps {
  file: File;
  isUploading: boolean;
  onRemove: () => void;
}

function UploadingFileTile({ file, isUploading, onRemove }: UploadingFileTileProps) {
  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";

  // Create object URL only when we need to show an image preview; revoke when tile unmounts.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  React.useEffect(() => {
    if (!isImage) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border bg-muted/30">
      <div className="relative aspect-square w-full overflow-hidden">
        {isImage && previewUrl ? (
          // oxlint-disable-next-line nextjs/no-img-element
          <img
            src={previewUrl}
            alt={file.name}
            className={cn("size-full object-cover", isUploading && "opacity-50")}
          />
        ) : isPdf ? (
          <div
            className={cn(
              "flex size-full items-center justify-center overflow-hidden bg-muted",
              isUploading && "opacity-50",
            )}
          >
            <PdfThumbnail file={file} width={200} className="relative" />
          </div>
        ) : (
          <div
            className={cn(
              "flex size-full items-center justify-center bg-muted",
              isUploading && "opacity-50",
            )}
          >
            <FileText className="size-10 text-red-500/70" />
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-foreground" />
          </div>
        )}

        {!isUploading && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-1 top-1 size-6 opacity-0 shadow-sm transition group-hover:opacity-100"
            onClick={handleRemove}
            aria-label={`Remove file ${file.name}`}
          >
            <X className="size-3" aria-hidden />
          </Button>
        )}
      </div>

      <div className="px-2 py-1.5">
        <p className="truncate text-xs font-medium">{file.name}</p>
        <p className="text-[10px] text-muted-foreground">{formatBytes(file.size)}</p>
      </div>
    </div>
  );
}
