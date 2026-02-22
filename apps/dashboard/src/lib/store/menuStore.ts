import type { StateSlice } from ".";

export type MenuState = {
  isOpen: boolean;
};

export type MenuActions = {
  toggleMenu: () => void;
  closeMenu: () => void;
};

export const createMenuStore: StateSlice<MenuState & MenuActions> = (set) => ({
  isOpen: false,
  toggleMenu: () => set((state) => ({ isOpen: !state.isOpen })),
  closeMenu: () => set({ isOpen: false }),
});
