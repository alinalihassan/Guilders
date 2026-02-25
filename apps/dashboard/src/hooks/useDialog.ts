import { useStore } from "@/lib/store";
import type { DialogState } from "@/lib/store/dialogStore";

type DialogData<T extends DialogState["type"]> = Omit<Extract<DialogState, { type: T }>, "type">;

type OpenFunction<T extends DialogState["type"]> =
  DialogData<T> extends Record<string, never> ? () => void : (data: DialogData<T>) => void;

export function useDialog<T extends DialogState["type"]>(type: T) {
  const dialogs = useStore((state) => state.dialogs);
  const openDialog = useStore((state) => state.openDialog);
  const closeDialog = useStore((state) => state.closeDialog);
  const updateDialog = useStore((state) => state.updateDialog);

  const dialog = dialogs.find((d) => d.type === type) as
    | (Extract<DialogState, { type: T }> & { isOpen: boolean })
    | undefined;
  const dialogData = dialog
    ? (({ type: _type, isOpen: _isOpen, ...rest }) => rest)(dialog)
    : undefined;

  return {
    isOpen: dialog?.isOpen ?? false,
    data: dialogData as DialogData<T> | undefined,
    open: ((data?: DialogData<T>) =>
      openDialog({
        type,
        ...data,
      } as DialogState)) as OpenFunction<T>,
    close: () => closeDialog(type),
    update: (data: DialogData<T>) =>
      updateDialog({
        type,
        ...data,
      } as DialogState),
  };
}
