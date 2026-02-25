import { create } from "zustand";

import { authClient } from "@/lib/auth-client";

type MfaSetup = {
  totpURI: string;
  backupCodes: string[];
};

interface SecurityStore {
  hasMFA: boolean;
  isLoadingMFA: boolean;
  setup: MfaSetup | null;
  checkMFAStatus: () => Promise<void>;
  startMFASetup: (password: string) => Promise<void>;
  verifyMFASetup: (code: string) => Promise<void>;
  clearMFASetup: () => void;
  unenrollMFA: (password: string) => Promise<void>;
}

export const useSecurityStore = create<SecurityStore>((set) => ({
  hasMFA: false,
  isLoadingMFA: false,
  setup: null,

  checkMFAStatus: async () => {
    set({ isLoadingMFA: true });
    const { data, error } = await authClient.getSession();
    if (error) {
      set({ hasMFA: false, isLoadingMFA: false });
      throw new Error(error.message);
    }
    set({
      hasMFA: Boolean((data as { user?: { twoFactorEnabled?: boolean } })?.user?.twoFactorEnabled),
      isLoadingMFA: false,
    });
  },

  startMFASetup: async (password: string) => {
    set({ isLoadingMFA: true });
    const { data, error } = await authClient.twoFactor.enable({
      password,
      issuer: "Guilders",
    });
    if (error) {
      set({ isLoadingMFA: false });
      throw new Error(error.message);
    }

    const setup = (data as { totpURI?: string; backupCodes?: string[] }) ?? {};
    if (!setup.totpURI) {
      set({ isLoadingMFA: false });
      throw new Error("Unable to initialize 2FA setup.");
    }

    set({
      setup: {
        totpURI: setup.totpURI,
        backupCodes: setup.backupCodes ?? [],
      },
      isLoadingMFA: false,
    });
  },

  verifyMFASetup: async (code: string) => {
    set({ isLoadingMFA: true });
    const { error } = await authClient.twoFactor.verifyTotp({
      code,
      trustDevice: true,
    });
    if (error) {
      set({ isLoadingMFA: false });
      throw new Error(error.message);
    }

    set({
      hasMFA: true,
      isLoadingMFA: false,
    });
  },

  clearMFASetup: () => {
    set({ setup: null });
  },

  unenrollMFA: async (password: string) => {
    set({ isLoadingMFA: true });
    const { error } = await authClient.twoFactor.disable({ password });
    if (error) {
      set({ isLoadingMFA: false });
      throw new Error(error.message);
    }
    set({ hasMFA: false, setup: null, isLoadingMFA: false });
  },
}));
