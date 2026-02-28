"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDialog } from "@/hooks/useDialog";

interface InputPromptDialogProps {
  title?: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  inputType?: "text" | "password";
  validate?: (value: string) => string | null;
  onConfirm: (value: string) => void;
  onCancel?: () => void;
}

export function InputPromptDialog() {
  const { isOpen, data, close } = useDialog("inputPrompt");
  const dialogData = data as InputPromptDialogProps | undefined;
  const resolvedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    resolvedRef.current = false;
  }, [isOpen]);

  if (!isOpen || !dialogData) return null;

  const {
    title = "Confirm",
    description,
    placeholder,
    defaultValue,
    confirmText = "Confirm",
    cancelText = "Cancel",
    inputType = "text",
    validate,
    onConfirm,
    onCancel,
  } = dialogData;

  const handleCancel = () => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    onCancel?.();
    close();
  };

  const handleConfirm = () => {
    if (resolvedRef.current) return;
    const rawValue = inputRef.current?.value ?? "";
    const nextValue = rawValue;
    const validationError = validate?.(nextValue);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    resolvedRef.current = true;
    try {
      onConfirm(nextValue);
    } finally {
      close();
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const input = inputRef.current;
    if (!input || input.disabled) return;

    const nextValue = input.value ?? "";
    if (validate?.(nextValue)) return;

    handleConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <Input
          key={`${title}-${defaultValue ?? ""}`}
          ref={inputRef}
          defaultValue={defaultValue ?? ""}
          placeholder={placeholder}
          type={inputType}
          autoComplete={inputType === "password" ? "current-password" : "off"}
          onKeyDown={handleInputKeyDown}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            {cancelText}
          </Button>
          <Button type="button" onClick={handleConfirm}>
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
