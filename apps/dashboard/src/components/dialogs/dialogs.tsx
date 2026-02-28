"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";

import { useDialog } from "@/hooks/useDialog";
import { useStore } from "@/lib/store";

const CommandMenu = dynamic(() => import("./command-menu").then((m) => ({ default: m.CommandMenu })));
const AddAccountDialog = dynamic(() =>
  import("./add-account-dialog").then((m) => ({ default: m.AddAccountDialog })),
);
const AddLinkedAccountDialog = dynamic(() =>
  import("./add-linked-account-dialog").then((m) => ({ default: m.AddLinkedAccountDialog })),
);
const AddTransactionDialog = dynamic(() =>
  import("./add-transaction-dialog").then((m) => ({ default: m.AddTransactionDialog })),
);
const EditAccountDialog = dynamic(() =>
  import("./edit-account-dialog").then((m) => ({ default: m.EditAccountDialog })),
);
const EditTransactionDialog = dynamic(() =>
  import("./edit-transaction-dialog").then((m) => ({ default: m.EditTransactionDialog })),
);
const ProviderDialog = dynamic(() =>
  import("./provider-dialog").then((m) => ({ default: m.ProviderDialog })),
);
const ConfirmationDialog = dynamic(() =>
  import("./confirmation-dialog").then((m) => ({ default: m.ConfirmationDialog })),
);
const MFADialog = dynamic(() => import("./mfa-dialog").then((m) => ({ default: m.MFADialog })));
const InputPromptDialog = dynamic(() =>
  import("./input-prompt-dialog").then((m) => ({ default: m.InputPromptDialog })),
);

function useCommandMenuShortcut() {
  const { isOpen, open, close } = useDialog("command");

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) close();
        else open({ pages: [] });
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isOpen, open, close]);
}

export const Dialogs = () => {
  useCommandMenuShortcut();

  const dialogs = useStore((state) => state.dialogs);
  const openTypes = new Set(dialogs.filter((d) => d.isOpen).map((d) => d.type));

  return (
    <>
      {openTypes.has("command") && <CommandMenu />}
      {openTypes.has("addManualAccount") && <AddAccountDialog />}
      {openTypes.has("addLinkedAccount") && <AddLinkedAccountDialog />}
      {openTypes.has("addTransaction") && <AddTransactionDialog />}
      {openTypes.has("editAccount") && <EditAccountDialog />}
      {openTypes.has("editTransaction") && <EditTransactionDialog />}
      {openTypes.has("provider") && <ProviderDialog />}
      {openTypes.has("confirmation") && <ConfirmationDialog />}
      {openTypes.has("mfa") && <MFADialog />}
      {openTypes.has("inputPrompt") && <InputPromptDialog />}
    </>
  );
};
