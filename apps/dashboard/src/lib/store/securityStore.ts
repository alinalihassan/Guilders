import { create } from "zustand";

interface SecurityStore {
  hasMFA: boolean;
  isLoadingMFA: boolean;
  checkMFAStatus: () => Promise<void>;
  unenrollMFA: () => Promise<void>;
}

export const useSecurityStore = create<SecurityStore>((set) => ({
  hasMFA: false,
  isLoadingMFA: false,

  checkMFAStatus: async () => {
    set({ hasMFA: false, isLoadingMFA: false });
  },

  unenrollMFA: async () => {
    set({ hasMFA: false, isLoadingMFA: false });
  },
}));
