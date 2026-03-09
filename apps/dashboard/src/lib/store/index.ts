// oxlint-disable typescript/no-explicit-any
import { create, type StateCreator } from "zustand";
import { persist } from "zustand/middleware";

import { createAdvisorStore } from "./advisorStore";
import { createDialogStore } from "./dialogStore";
import { createMenuStore } from "./menuStore";

export type StateSlice<T extends object> = StateCreator<T>;

type StateFromFunctions<T extends [...any]> = T extends [infer F, ...infer R]
  ? F extends (...args: any) => object
    ? StateFromFunctions<R> & ReturnType<F>
    : unknown
  : unknown;

type State = StateFromFunctions<
  [typeof createDialogStore, typeof createMenuStore, typeof createAdvisorStore]
>;

const STORAGE_KEY = "guilders-dashboard-ui";

export const useStore = create<State>()(
  persist(
    (...a) => ({
      ...createDialogStore(...a),
      ...createMenuStore(...a),
      ...createAdvisorStore(...a),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        advisorOpen: state.advisorOpen,
        advisorReadOnly: state.advisorReadOnly,
      }),
    },
  ),
);
