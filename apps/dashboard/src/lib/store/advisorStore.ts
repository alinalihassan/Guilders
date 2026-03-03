import type { UIMessage } from "ai";

import type { StateSlice } from ".";

export type AdvisorState = {
  advisorOpen: boolean;
  sessionTitle: string;
  currentChatId: string | null;
  initialMessages: UIMessage[];
};

export type AdvisorActions = {
  openAdvisorSidebar: () => void;
  closeAdvisorSidebar: () => void;
  setSessionTitle: (title: string) => void;
  resetSessionTitle: () => void;
  setCurrentChat: (id: string | null, title: string, messages: UIMessage[]) => void;
  clearChat: () => void;
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

const INITIAL_SESSION_TITLE = "New chat";

export const createAdvisorStore: StateSlice<AdvisorState & AdvisorActions> = (set) => ({
  advisorOpen: false,
  sessionTitle: INITIAL_SESSION_TITLE,
  currentChatId: null,
  initialMessages: [],
  openAdvisorSidebar: () => set({ advisorOpen: true }),
  closeAdvisorSidebar: () => set({ advisorOpen: false }),
  setSessionTitle: (title) => set({ sessionTitle: title }),
  resetSessionTitle: () => set({ sessionTitle: getDefaultSessionTitle() }),
  setCurrentChat: (id, title, messages) =>
    set({ currentChatId: id, sessionTitle: title || getDefaultSessionTitle(), initialMessages: messages }),
  clearChat: () =>
    set({ currentChatId: null, initialMessages: [], sessionTitle: getDefaultSessionTitle() }),
});
