
import { lazy, Suspense, useEffect } from "react";

import { useDialog } from "@/hooks/useDialog";
import { useStore } from "@/lib/store";

const CommandMenu = lazy(() => import("./command-menu").then((m) => ({ default: m.CommandMenu })));
const AddAccountDialog = lazy(() =>
  import("./add-account-dialog").then((m) => ({ default: m.AddAccountDialog })),
);
const AddLinkedAccountDialog = lazy(() =>
  import("./add-linked-account-dialog").then((m) => ({ default: m.AddLinkedAccountDialog })),
);
const AddTransactionDialog = lazy(() =>
  import("./add-transaction-dialog").then((m) => ({ default: m.AddTransactionDialog })),
);
const EditAccountDialog = lazy(() =>
  import("./edit-account-dialog").then((m) => ({ default: m.EditAccountDialog })),
);
const EditTransactionDialog = lazy(() =>
  import("./edit-transaction-dialog").then((m) => ({ default: m.EditTransactionDialog })),
);
const ProviderDialog = lazy(() =>
  import("./provider-dialog").then((m) => ({ default: m.ProviderDialog })),
);
const ConfirmationDialog = lazy(() =>
  import("./confirmation-dialog").then((m) => ({ default: m.ConfirmationDialog })),
);
const MFADialog = lazy(() => import("./mfa-dialog").then((m) => ({ default: m.MFADialog })));
const InputPromptDialog = lazy(() =>
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
      {openTypes.has("command") && (
        <Suspense fallback={null}>
          <CommandMenu />
        </Suspense>
      )}
      {openTypes.has("addManualAccount") && (
        <Suspense fallback={null}>
          <AddAccountDialog />
        </Suspense>
      )}
      {openTypes.has("addLinkedAccount") && (
        <Suspense fallback={null}>
          <AddLinkedAccountDialog />
        </Suspense>
      )}
      {openTypes.has("addTransaction") && (
        <Suspense fallback={null}>
          <AddTransactionDialog />
        </Suspense>
      )}
      {openTypes.has("editAccount") && (
        <Suspense fallback={null}>
          <EditAccountDialog />
        </Suspense>
      )}
      {openTypes.has("editTransaction") && (
        <Suspense fallback={null}>
          <EditTransactionDialog />
        </Suspense>
      )}
      {openTypes.has("provider") && (
        <Suspense fallback={null}>
          <ProviderDialog />
        </Suspense>
      )}
      {openTypes.has("confirmation") && (
        <Suspense fallback={null}>
          <ConfirmationDialog />
        </Suspense>
      )}
      {openTypes.has("mfa") && (
        <Suspense fallback={null}>
          <MFADialog />
        </Suspense>
      )}
      {openTypes.has("inputPrompt") && (
        <Suspense fallback={null}>
          <InputPromptDialog />
        </Suspense>
      )}
    </>
  );
};
