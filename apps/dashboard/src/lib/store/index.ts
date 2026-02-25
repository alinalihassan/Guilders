// oxlint-disable typescript/no-explicit-any
import { create, type StateCreator } from "zustand";

import { createDialogStore } from "./dialogStore";
import { createMenuStore } from "./menuStore";

export type StateSlice<T extends object> = StateCreator<T>;

type StateFromFunctions<T extends [...any]> = T extends [infer F, ...infer R]
  ? F extends (...args: any) => object
    ? StateFromFunctions<R> & ReturnType<F>
    : unknown
  : unknown;

type State = StateFromFunctions<[typeof createDialogStore, typeof createMenuStore]>;

export const useStore = create<State>((...a) => ({
  ...createDialogStore(...a),
  ...createMenuStore(...a),
}));
