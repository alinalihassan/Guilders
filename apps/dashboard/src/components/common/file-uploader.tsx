"use client";

import type { CreateDocumentResponse } from "@guilders/api/types";
import { FileText, Image, Loader2, Upload, X } from "lucide-react";
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
  onView?: (id: number) => string;
}

const DEFAULT_ACCEPT: DropzoneProps["accept"] = {
  "image/jpeg": [],
  "image/png": [],
  "image/webp": [],
  "image/heic": [],
  "application/pdf": [],
};

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

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
  onRemoveExisting,
  onView,
  className,
  ...dropzoneProps
}: FileUploaderProps) {
  const [files, setFiles] = useControllableState({
    prop: valueProp,
    onChange: onValueChange,
  });

  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());

  const handleUpload = React.useCallback(
    async (newFiles: File[]) => {
      if (!onUpload) return;

      setUploadingFiles(new Set(newFiles.map((f) => f.name)));

      try {
        await onUpload(newFiles);
        setFiles([]);
        toast.success("Upload complete");
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload files");
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

      const newFiles = acceptedFiles.map((file) =>
        Object.assign(file, { preview: URL.createObjectURL(file) }),
      );

      setFiles(newFiles);

      if (newFiles.length > 0) {
        handleUpload(newFiles);
      }
    },
    [files, documents.length, maxFileCount, maxSize, multiple, setFiles, handleUpload],
  );

  const onRemove = (index: number) => {
    if (!files) return;
    const file = files[index];
    if (file && "preview" in file) {
      URL.revokeObjectURL((file as File & { preview: string }).preview);
    }
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

  return (
    <div className="relative flex flex-col gap-4 overflow-hidden">
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
              "group relative grid h-40 w-full cursor-pointer place-items-center rounded-lg border-2 border-dashed border-muted-foreground/25 px-5 py-2.5 text-center transition hover:bg-muted/25",
              "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isDragActive && "border-primary/50 bg-primary/5",
              isDisabled && "pointer-events-none opacity-60",
              className,
            )}
          >
            <input {...getInputProps()} />
            <DropzoneContent isDragActive={isDragActive} maxSize={maxSize} />
          </div>
        )}
      </Dropzone>

      {((files?.length ?? 0) > 0 || documents.length > 0) && (
        <ScrollArea className="h-fit w-full">
          <div className="flex max-h-48 flex-col gap-2">
            {documents.map((doc) => (
              <ExistingFileCard
                key={doc.id}
                document={doc}
                onRemove={() => handleRemoveExisting(doc.id)}
                onView={onView ? () => onView(doc.id) : undefined}
              />
            ))}
            {files?.map((file, index) => (
              <NewFileCard
                key={file.name}
                file={file}
                onRemove={() => onRemove(index)}
                isUploading={uploadingFiles.has(file.name)}
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
}: {
  isDragActive: boolean;
  maxSize: number;
}) {
  if (isDragActive) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 sm:px-5">
        <div className="rounded-full border border-dashed border-primary/50 p-3">
          <Upload className="size-6 text-primary" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-primary">Drop files here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 sm:px-5">
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

function FileTypeIcon({ type, className }: { type: string; className?: string }) {
  if (type.startsWith("image/")) {
    return <Image className={cn("text-blue-500", className)} />;
  }
  if (type === "application/pdf") {
    return <FileText className={cn("text-red-500", className)} />;
  }
  return <FileText className={cn("text-muted-foreground", className)} />;
}

function FilePreview({ file }: { file: File & { preview?: string } }) {
  if (file.type.startsWith("image/") && file.preview) {
    return (
      // oxlint-disable-next-line nextjs/no-img-element
      <img
        src={file.preview}
        alt={file.name}
        className="size-10 rounded-md border object-cover"
        onLoad={() => URL.revokeObjectURL(file.preview!)}
      />
    );
  }

  return (
    <div className="flex size-10 items-center justify-center rounded-md border bg-muted">
      <FileTypeIcon type={file.type} className="size-5" />
    </div>
  );
}

interface ExistingFileCardProps {
  document: { id: number; name: string; path: string };
  onRemove: () => void;
  onView?: () => string;
}

function ExistingFileCard({ document, onRemove, onView }: ExistingFileCardProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  const handleView = () => {
    if (!onView) return;
    const url = onView();
    window.open(url, "_blank");
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await onRemove();
    } catch {
      // toast handled by parent
    } finally {
      setIsRemoving(false);
    }
  };

  const isPdf =
    document.name.toLowerCase().endsWith(".pdf") ||
    document.path.toLowerCase().endsWith(".pdf");

  return (
    <div className="flex items-center gap-3 rounded-md border p-2">
      <div className="flex size-10 items-center justify-center rounded-md bg-muted">
        {isPdf ? (
          <FileText className="size-5 text-red-500" />
        ) : (
          <Image className="size-5 text-blue-500" />
        )}
      </div>
      <div className="flex-1 truncate">
        <p className="truncate text-sm font-medium">{document.name}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onView && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={handleView}
          >
            View
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={handleRemove}
          disabled={isRemoving}
        >
          {isRemoving ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
          <span className="sr-only">Remove file</span>
        </Button>
      </div>
    </div>
  );
}

interface NewFileCardProps {
  file: File & { preview?: string };
  onRemove: () => void;
  isUploading?: boolean;
}

function NewFileCard({ file, onRemove, isUploading }: NewFileCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-md border p-2">
      <FilePreview file={file} />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
      </div>
      <div className="flex shrink-0 items-center">
        {isUploading ? (
          <div className="grid size-7 place-items-center">
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onRemove}
          >
            <X className="size-3.5" />
            <span className="sr-only">Remove file</span>
          </Button>
        )}
      </div>
    </div>
  );
}
