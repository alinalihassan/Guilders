import { create } from "zustand";

type TwoFactorMethod = "totp" | "backup";

interface AuthStore {
  isLoading: boolean;
  isSigningInWithPasskey: boolean;
  requiresTwoFactor: boolean;
  twoFactorMethod: TwoFactorMethod;
  twoFactorCode: string;
  isVerifyingTwoFactor: boolean;
  setIsLoading: (isLoading: boolean) => void;
  setIsSigningInWithPasskey: (isSigningInWithPasskey: boolean) => void;
  setRequiresTwoFactor: (requiresTwoFactor: boolean) => void;
  setTwoFactorMethod: (twoFactorMethod: TwoFactorMethod) => void;
  setTwoFactorCode: (twoFactorCode: string) => void;
  setIsVerifyingTwoFactor: (isVerifyingTwoFactor: boolean) => void;
  resetAuthState: () => void;
}

const defaultAuthState = {
  isLoading: false,
  isSigningInWithPasskey: false,
  requiresTwoFactor: false,
  twoFactorMethod: "totp" as const,
  twoFactorCode: "",
  isVerifyingTwoFactor: false,
};

export const useAuthStore = create<AuthStore>((set) => ({
  ...defaultAuthState,
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsSigningInWithPasskey: (isSigningInWithPasskey) => set({ isSigningInWithPasskey }),
  setRequiresTwoFactor: (requiresTwoFactor) => set({ requiresTwoFactor }),
  setTwoFactorMethod: (twoFactorMethod) => set({ twoFactorMethod }),
  setTwoFactorCode: (twoFactorCode) => set({ twoFactorCode }),
  setIsVerifyingTwoFactor: (isVerifyingTwoFactor) => set({ isVerifyingTwoFactor }),
  resetAuthState: () => set(defaultAuthState),
}));
