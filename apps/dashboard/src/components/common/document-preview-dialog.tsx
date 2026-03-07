
import { Download, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  type: string;
  fileUrl: string;
}

const dialogIconButtonClass =
  "rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground";

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  name,
  type,
  fileUrl,
}: DocumentPreviewDialogProps) {
  const [downloading, setDownloading] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  useEffect(() => {
    if (open) {
      setPageNumber(1);
      setNumPages(null);
    }
  }, [open, fileUrl]);

  const isImage = type.startsWith("image/");
  const isPdf = type === "application/pdf";

  const fileSource = useMemo(() => ({ url: fileUrl, withCredentials: true }), [fileUrl]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(fileUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setDownloading(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
    setPageNumber(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] max-w-4xl flex-col gap-0 p-0"
        showCloseIcon={false}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3 pr-4">
          <DialogTitle className="truncate text-base font-medium">{name}</DialogTitle>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={dialogIconButtonClass}
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              <span className="sr-only">Download</span>
            </Button>
            <DialogClose className={dialogIconButtonClass} asChild>
              <Button type="button" variant="ghost" size="icon">
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </div>
        </div>

        <div className="relative min-h-[60vh] flex-1 overflow-auto bg-muted/30 p-4">
          {isImage && (
            <img
              src={fileUrl}
              alt={name}
              className="mx-auto max-h-[70vh] w-auto max-w-full object-contain"
            />
          )}
          {isPdf && (
            <PdfPreview
              fileSource={fileSource}
              pageNumber={pageNumber}
              numPages={numPages}
              onDocumentLoadSuccess={onDocumentLoadSuccess}
              onPrevPage={() => setPageNumber((p) => Math.max(1, p - 1))}
              onNextPage={() => setPageNumber((p) => Math.min(numPages ?? 1, p + 1))}
            />
          )}
          {!isImage && !isPdf && (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Preview not available for this file type.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PdfPreviewProps {
  fileSource: { url: string; withCredentials: boolean };
  pageNumber: number;
  numPages: number | null;
  onDocumentLoadSuccess: (args: { numPages: number }) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}

function PdfPreview({
  fileSource,
  pageNumber,
  numPages,
  onDocumentLoadSuccess,
  onPrevPage,
  onNextPage,
}: PdfPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setErrorMessage(null);
  }, [fileSource, pageNumber]);

  const onDocumentLoadError = () => {
    setLoading(false);
    setErrorMessage("Failed to load PDF.");
  };

  const onPageRenderError = () => {
    setLoading(false);
    setErrorMessage("Failed to render page.");
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <Document
        file={fileSource}
        loading={null}
        error={null}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
      >
        {errorMessage ? (
          <div className="flex min-h-[40vh] items-center justify-center text-sm text-destructive">
            {errorMessage}
          </div>
        ) : loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : null}
        {!errorMessage && (
          <Page
            pageNumber={pageNumber}
            width={800}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            onRenderSuccess={() => setLoading(false)}
            onRenderError={onPageRenderError}
          />
        )}
      </Document>
      {numPages !== null && numPages > 1 && (
        <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={onPrevPage}
            disabled={pageNumber <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {pageNumber} / {numPages}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={onNextPage}
            disabled={pageNumber >= numPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
