"use client";

import { FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface PdfThumbnailProps {
  file: string | File;
  width?: number;
  className?: string;
}

export function PdfThumbnail({ file, width = 200, className }: PdfThumbnailProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const fileSource = typeof file === "string" ? { url: file, withCredentials: true } : file;

  if (error) {
    return (
      <div className="flex size-full items-center justify-center">
        <FileText className="size-10 text-red-500/70" />
      </div>
    );
  }

  return (
    <div className={className}>
      {!loaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}
      <Document file={fileSource} loading={null} error={null} onLoadError={() => setError(true)}>
        <Page
          pageNumber={1}
          width={width}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          onRenderSuccess={() => setLoaded(true)}
          onRenderError={() => setError(true)}
        />
      </Document>
    </div>
  );
}
