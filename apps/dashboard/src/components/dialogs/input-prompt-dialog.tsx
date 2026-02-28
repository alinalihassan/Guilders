"use client";

import { useEffect, useRef, useState } from "react";
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
  const [value, setValue] = useState("");
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      resolvedRef.current = false;
      setValue(dialogData?.defaultValue ?? "");
    }
  }, [isOpen, dialogData?.defaultValue]);

  if (!isOpen || !dialogData) return null;

  const {
    title = "Confirm",
    description,
    placeholder,
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
    const nextValue = value.trim();
    const validationError = validate?.(nextValue);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    resolvedRef.current = true;
    onConfirm(nextValue);
    close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          type={inputType}
          autoComplete={inputType === "password" ? "current-password" : "off"}
        />
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {cancelText}
          </Button>
          <Button onClick={handleConfirm}>{confirmText}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
