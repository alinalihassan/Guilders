"use client";

import { AddAccountDialog } from "./add-account-dialog";
import { AddLinkedAccountDialog } from "./add-linked-account-dialog";
import { AddTransactionDialog } from "./add-transaction-dialog";
import { CommandMenu } from "./command-menu";
import { ConfirmationDialog } from "./confirmation-dialog";
import { EditAccountDialog } from "./edit-account-dialog";
import { EditTransactionDialog } from "./edit-transaction-dialog";
import { MFADialog } from "./mfa-dialog";
import { ProviderDialog } from "./provider-dialog";

export const Dialogs = () => (
  <>
    <CommandMenu />
    <AddAccountDialog />
    <AddLinkedAccountDialog />
    <AddTransactionDialog />
    <EditAccountDialog />
    <EditTransactionDialog />
    <ProviderDialog />
    <ConfirmationDialog />
    <MFADialog />
  </>
);
