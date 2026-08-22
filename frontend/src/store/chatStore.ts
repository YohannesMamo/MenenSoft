import { create } from 'zustand';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  sentAt: string;
  fileUrl?: string;
  fileName?: string;
}

interface ChatState {
  messages: Record<string, Message[]>;        // conversationId -> messages
  typingUsers: Record<string, string[]>;      // conversationId -> user names
  onlineUsers: Set<string>;
  
  addMessage: (convId: string, msg: Message) => void;
  setMessages: (convId: string, msgs: Message[]) => void;
  addTypingUser: (convId: string, userName: string) => void;
  removeTypingUser: (convId: string, userName: string) => void;
  setOnlineUsers: (users: string[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: {},
  typingUsers: {},
  onlineUsers: new Set(),

  addMessage: (convId, msg) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [convId]: [...(state.messages[convId] || []), msg],
      },
    })),

  setMessages: (convId, msgs) =>
    set((state) => ({
      messages: { ...state.messages, [convId]: msgs },
    })),

  addTypingUser: (convId, userName) =>
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [convId]: [...(state.typingUsers[convId] || []), userName],
      },
    })),

  removeTypingUser: (convId, userName) =>
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [convId]: (state.typingUsers[convId] || []).filter(u => u !== userName),
      },
    })),

  setOnlineUsers: (users) => set({ onlineUsers: new Set(users) }),
}));