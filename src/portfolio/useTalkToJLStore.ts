import { create } from "zustand";

export type TalkMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

interface TalkToJLStoreState {
  messages: TalkMessage[];
  addMessage: (message: TalkMessage) => void;
  replaceMessages: (messages: TalkMessage[]) => void;
  clear: () => void;
}

const GREETING: TalkMessage = {
  id: "greeting",
  role: "assistant",
  content:
    "i'm jiahao. ask about a project, what i'm building with dinder, or what kind of collaboration you're thinking about.",
};

export const useTalkToJLStore = create<TalkToJLStoreState>((set) => ({
  messages: [GREETING],
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  replaceMessages: (messages) => set({ messages }),
  clear: () => set({ messages: [GREETING] }),
}));
