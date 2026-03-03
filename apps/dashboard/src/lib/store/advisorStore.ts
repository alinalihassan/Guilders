import type { StateSlice } from ".";

export type AdvisorState = {
  advisorOpen: boolean;
  sessionTitle: string;
};

export type AdvisorActions = {
  openAdvisorSidebar: () => void;
  closeAdvisorSidebar: () => void;
  setSessionTitle: (title: string) => void;
  resetSessionTitle: () => void;
};

export function getDefaultSessionTitle(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `New chat ${y}-${m}-${d} ${h}:${min}`;
}

/** Static initial title to avoid server/client hydration mismatch (getDefaultSessionTitle uses Date). */
const INITIAL_SESSION_TITLE = "New chat";

export const createAdvisorStore: StateSlice<AdvisorState & AdvisorActions> = (set) => ({
  advisorOpen: false,
  sessionTitle: INITIAL_SESSION_TITLE,
  openAdvisorSidebar: () => set({ advisorOpen: true }),
  closeAdvisorSidebar: () => set({ advisorOpen: false }),
  setSessionTitle: (title) => set({ sessionTitle: title }),
  resetSessionTitle: () => set({ sessionTitle: getDefaultSessionTitle() }),
});
