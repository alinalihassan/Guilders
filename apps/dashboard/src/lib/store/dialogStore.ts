import type { Account, Institution, Transaction } from "@guilders/api/types";

import type { StateSlice } from ".";

export type DialogState =
  | {
      type: "command";
      pages: string[];
    }
  | {
      type: "addManualAccount";
    }
  | {
      type: "addLinkedAccount";
      institution: Institution | null;
    }
  | {
      type: "provider";
      redirectUri: string;
      operation: "connect" | "reconnect";
      redirectType: "redirect" | "popup";
    }
  | {
      type: "editAccount";
      account: Account | null;
    }
  | {
      type: "editTransaction";
      transaction: Transaction | null;
    }
  | {
      type: "addTransaction";
      accountId?: number;
    }
  | {
      type: "mfa";
    }
  | {
      type: "confirmation";
      title?: string;
      description?: string;
      confirmText?: string;
      cancelText?: string;
      variant?: "default" | "destructive";
      isLoading?: boolean;
      onConfirm: () => void;
    };

export type DialogWithState = DialogState & { isOpen: boolean };

export type DialogsState = {
  dialogs: DialogWithState[];
};

export type DialogActions = {
  openDialog: (dialog: DialogState) => void;
  closeDialog: (type: DialogState["type"]) => void;
  updateDialog: (dialog: DialogState) => void;
};

export const createDialogStore: StateSlice<DialogsState & DialogActions> = (set, get) => ({
  dialogs: [],
  openDialog: (dialog) =>
    set((state) => ({
      dialogs: [
        ...state.dialogs.filter((d) => d.type !== dialog.type),
        { ...dialog, isOpen: true },
      ],
    })),
  closeDialog: (type) =>
    set((state) => ({
      dialogs: state.dialogs.filter((d) => d.type !== type),
    })),
  updateDialog: (dialog) =>
    set((state) => ({
      dialogs: state.dialogs.map((d) => (d.type === dialog.type ? { ...dialog, isOpen: true } : d)),
    })),
});
