import { useStore } from "../store";
import type { DialogState } from "../store/dialogStore";

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

  return {
    isOpen: dialog?.isOpen ?? false,
    data: dialog && ((({ type, isOpen, ...rest }) => rest)(dialog) as DialogData<T> | undefined),
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
