import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { resolveApiBase } from '../config/api';
import { chatApi } from '../services/chatApi';

interface Conversation {
  ConversationID: string;
  CName: string | null;
  IsGroup: boolean;
  Participants: string[];
  LastMessage?: {
    Content: string | null;
    MContent?: string | null;
    SentAt: string | null;
    SenderID: string | null;
  };
}

interface Message {
  MessageID: string;
  MConversationID: string;     // Match DBvvv
  SenderID: string;
  MContent: string;            // Match DB
  SentAt: string;
  IsRead: boolean;
  FileURL?: string;
  FileName?: string;
  ClientID?: string;
}

interface ChatContextType {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  socket: Socket | null;
  userId: string | null;
  onlineUsers: Set<string>;
  lastSeenByUser: Record<string, string>;
  selectConversation: (conv: Conversation) => void;
  joinConversation: (conversationId: string) => void;
  fetchConversations: () => Promise<void>;
  sendMessage: (conversationId: string, content: string, fileUrl?: string, fileName?: string) => Promise<Message>;
  markAsRead: (conversationId: string) => void;
  uploadFile: (file: File) => Promise<{ FileURL: string; FileName: string }>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

/**
 * Merge a server message into the list, replacing an optimistic bubble when
 * possible. Reconciliation is by ClientID (reliable even for identical texts);
 * the content match is only a fallback for messages sent without one.
 */
function reconcileMessage(prev: Message[], incoming: Message, currentUserId: string | null): Message[] {
  if (incoming.MessageID && prev.some((m) => m.MessageID === incoming.MessageID)) {
    return prev;
  }

  if (incoming.ClientID) {
    const index = prev.findIndex(
      (m) => m.MessageID.startsWith('temp_') && m.ClientID === incoming.ClientID
    );
    if (index >= 0) {
      const next = [...prev];
      next[index] = incoming;
      return next;
    }
  }

  if (incoming.SenderID === currentUserId) {
    const index = prev.findIndex(
      (m) =>
        m.MessageID.startsWith('temp_') &&
        !m.ClientID &&
        m.SenderID === incoming.SenderID &&
        m.MContent === incoming.MContent
    );
    if (index >= 0) {
      const next = [...prev];
      next[index] = incoming;
      return next;
    }
  }

  return [...prev, incoming];
}

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const selectedConversationRef = useRef<Conversation | null>(null);
  const pendingConversationRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [lastSeenByUser, setLastSeenByUser] = useState<Record<string, string>>({});

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  const selectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv);
    selectedConversationRef.current = conv;
    setMessages([]);
    await fetchMessages(conv.ConversationID);
    joinConversation(conv.ConversationID);
  };

  const fetchConversations = async () => {
    if (!userId) return;

    try {
      const res = await chatApi.get<Conversation[]>('/api/chat/conversations');

      // The API sends the last message as `MContent`; the UI reads `Content`.
      // Normalise here so previews render for every caller.
      const normalizedConversations = (Array.isArray(res.data) ? res.data : []).map((conv: any) => ({
        ...conv,
        LastMessage: conv.LastMessage
          ? {
              ...conv.LastMessage,
              Content: conv.LastMessage.Content ?? conv.LastMessage.MContent ?? null,
            }
          : conv.LastMessage,
      }));

      setConversations(normalizedConversations);

      if (socketRef.current?.connected && userId) {
        const uniqueConversationIds = Array.from(new Set(normalizedConversations.map((conv: Conversation) => conv.ConversationID).filter(Boolean))) as string[];
        uniqueConversationIds.forEach((conversationId: string) => {
          socketRef.current?.emit('join_conversation', {
            conversation_id: conversationId,
            user_id: userId
          });
        });
      }
    } catch (error) {
      console.error('Failed to fetch conversations', error);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    if (!userId) return;

    setLoading(true);
    setMessages([]);

    try {
      const res = await chatApi.get<Message[]>(
        `/api/chat/messages/${conversationId}`
      );

      const mappedMessages = res.data.map((msg: any) => ({
        ...msg,
        ConversationID: msg.MConversationID,
        Content: msg.MContent
      }));

      setMessages(mappedMessages);
    } catch (error) {
      console.error('Failed to fetch messages', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  

  const joinConversation = (conversationId: string) => {
    pendingConversationRef.current = conversationId;

    if (socketRef.current && userId && socketRef.current.connected) {
      socketRef.current.emit('join_conversation', {
        conversation_id: conversationId,
        user_id: userId
      });
      pendingConversationRef.current = null;
      console.log(`[Socket] Joined conversation room: ${conversationId}`);
    } else {
      console.warn('[Socket] Socket not connected yet or userId missing; will join once connected');
    }
  };

  const sendMessage = async (conversationId: string, content: string, fileUrl?: string): Promise<Message> => {
    if (!userId) {
      throw new Error('You are not signed in');
    }

    const clientId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const optimisticMessage: Message = {
      MessageID: clientId,
      MConversationID: conversationId,
      SenderID: userId,
      MContent: content,
      SentAt: new Date().toISOString(),
      IsRead: false,
      FileURL: fileUrl,
      ClientID: clientId
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    const removeOptimistic = () =>
      setMessages((prev) => prev.filter((msg) => msg.MessageID !== clientId));

    const applyServerMessage = (message: Message) => {
      const saved = { ...message, ClientID: message.ClientID ?? clientId };
      setMessages((prev) => reconcileMessage(prev, saved, userId));
    };

    const sendOverHttp = async (): Promise<Message> => {
      try {
        const res = await chatApi.post<Message>('/api/chat/messages', {
          ConversationID: conversationId,
          MContent: content,
          FileURL: fileUrl ?? null,
          ClientID: clientId
        });
        const saved = { ...res.data, ClientID: res.data.ClientID ?? clientId };
        applyServerMessage(saved);
        return saved;
      } catch (error: any) {
        removeOptimistic();
        const detail = error?.response?.data?.detail || error?.message;
        throw new Error(typeof detail === 'string' && detail ? detail : 'Failed to send message');
      }
    };

    const activeSocket = socketRef.current;
    if (!activeSocket || !activeSocket.connected) {
      console.warn('[ChatContext] Socket unavailable, sending message over HTTP');
      return sendOverHttp();
    }

    return new Promise<Message>((resolve, reject) => {
      let settled = false;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        activeSocket.off('message_sent', handleMessageSent);
        activeSocket.off('error', handleSocketError);
        activeSocket.off('disconnect', handleDisconnect);
      };

      const finishOk = (message: Message) => {
        if (settled) return;
        settled = true;
        cleanup();
        applyServerMessage(message);
        resolve(message);
      };

      const fail = (reason: string) => {
        if (settled) return;
        settled = true;
        cleanup();
        removeOptimistic();
        reject(new Error(reason));
      };

      // The socket dropped mid-send: retry over HTTP so the message is not lost.
      const handleDisconnect = () => {
        if (settled) return;
        settled = true;
        cleanup();
        console.warn('[ChatContext] Socket disconnected while sending; retrying over HTTP');
        sendOverHttp().then(resolve).catch(reject);
      };

      const handleMessageSent = (data: any) => {
        if (data?.success && data.message) {
          finishOk(data.message as Message);
        } else {
          fail(data?.message || 'Server did not confirm the message');
        }
      };

      const handleSocketError = (data: any) => {
        fail(data?.message || 'Failed to send message');
      };

      timeoutId = setTimeout(() => {
        // The message may or may not have been stored; drop the optimistic
        // bubble so the UI never shows a permanently unconfirmed message.
        fail('Message send timed out. Please try again.');
      }, 10000);

      activeSocket.once('message_sent', handleMessageSent);
      activeSocket.once('error', handleSocketError);
      activeSocket.once('disconnect', handleDisconnect);

      activeSocket.emit('send_message', {
        conversation_id: conversationId,
        sender_id: userId,
        content,
        file_url: fileUrl,
        client_id: clientId
      });
    });
  };
  const markAsRead = async (conversationId: string) => {
    if (!userId) return;
    
    try {
      await chatApi.post(`/api/chat/conversations/${conversationId}/read`);
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const uploadFile = async (file: File): Promise<{ FileURL: string; FileName: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await chatApi.post<{ FileURL: string; FileName: string }>(
      '/api/chat/upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data;
  };

  useEffect(() => {
    const checkUserId = () => {
      const studentData = localStorage.getItem('student');
      let studentId = null;

      if (studentData) {
        try {
          const parsed = JSON.parse(studentData);
          studentId = parsed.StudentID || parsed.studentId || parsed.UserID;
        } catch (e) {
          console.error('Failed to parse student data', e);
        }
      }

      if (!studentId) {
        studentId = localStorage.getItem('studentId') || localStorage.getItem('userId');
      }

      if (studentId) {
        console.log('[ChatContext] Setting StudentID:', studentId);
        setUserId(String(studentId));
      } else {
        console.log('[ChatContext] No StudentID found in localStorage');
      }
    };

    checkUserId();
    const interval = setInterval(checkUserId, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!userId) {
      console.log('[ChatContext] Socket.IO: userId is null, skipping connection');
      return;
    }

    let cleanupFn: (() => void) | null = null;

    (async () => {
      const SOCKET_URL = await resolveApiBase();
      console.log('[ChatContext] Socket.IO: Starting connection to:', SOCKET_URL);
    
      const newSocket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        auth: { token: localStorage.getItem('token') }
      });

      newSocket.on('connect', () => {
      console.log('[ChatContext] Socket.IO connected:', newSocket.id);
      socketRef.current = newSocket;
      newSocket.emit('register_user', { user_id: userId });

      const joinAllStoredConversations = () => {
        const conversationIds = Array.from(new Set((conversations || []).map((conv: Conversation) => conv.ConversationID).filter(Boolean)));
        conversationIds.forEach((conversationId: string) => {
          newSocket.emit('join_conversation', {
            conversation_id: conversationId,
            user_id: userId
          });
        });
      };

      if (pendingConversationRef.current) {
        newSocket.emit('join_conversation', {
          conversation_id: pendingConversationRef.current,
          user_id: userId
        });
        pendingConversationRef.current = null;
      } else if (selectedConversationRef.current?.ConversationID) {
        newSocket.emit('join_conversation', {
          conversation_id: selectedConversationRef.current.ConversationID,
          user_id: userId
        });
      }

      joinAllStoredConversations();
    });

    newSocket.on('disconnect', () => {
      console.log('[ChatContext] Socket.IO disconnected');
    });

    newSocket.on('new_message', (data: Message) => {
      console.log('[ChatContext] New message received:', data);

      const activeConversationId = selectedConversationRef.current?.ConversationID;
      
      // Handle message from any sender (including self)
      if (activeConversationId === data.MConversationID) {
        setMessages((prev) => reconcileMessage(prev, data, userId));

        // Mark messages as read for current user (but not for sender's own messages)
        if (data.SenderID !== userId) {
          chatApi
            .post(`/api/chat/conversations/${data.MConversationID}/read`)
            .catch(console.error);
        }
      } else {
        console.log('[ChatContext] Message is for different conversation, not updating current view');
      }

      // Always update conversation list (for last message preview, etc.)
      fetchConversations();
    });

    newSocket.on('conversation_updated', () => {
      console.log('[ChatContext] Conversation updated signal received');
      fetchConversations();
    });

    newSocket.on('message_notification', (data: any) => {
      console.log('[ChatContext] Message notification:', data);
      fetchConversations();
    });

    newSocket.on('error', (data: any) => {
      console.error('[ChatContext] Socket.IO error:', data);
      // Errors are handled in sendMessage's error listener
    });

    newSocket.on('user_typing', (data: any) => {
      console.log('[ChatContext] User typing:', data);
    });

    newSocket.on('online_users', (userIds: string[]) => {
      console.log('[ChatContext] Online users:', userIds);
      setOnlineUsers(new Set(userIds));
    });

    newSocket.on('user_online', (data: { user_id: string }) => {
      console.log('[ChatContext] User came online:', data.user_id);
      setOnlineUsers(prev => new Set(prev).add(data.user_id));
      setLastSeenByUser(prev => ({ ...prev, [data.user_id]: new Date().toISOString() }));
    });

    newSocket.on('user_offline', (data: { user_id: string }) => {
      console.log('[ChatContext] User went offline:', data.user_id);
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.user_id);
        return newSet;
      });
      setLastSeenByUser(prev => ({ ...prev, [data.user_id]: new Date().toISOString() }));
    });

    // Heartbeat: keep this tab registered as online and refresh last_seen server-side
    const heartbeat = setInterval(() => {
      if (newSocket.connected && userId) {
        newSocket.emit('register_user', { user_id: userId });
      }
    }, 30000);

    setSocket(newSocket);
    socketRef.current = newSocket;

    cleanupFn = () => {
      clearInterval(heartbeat);
      if (socketRef.current === newSocket) {
        socketRef.current = null;
      }
      newSocket.disconnect();
    };
    })();

    return () => { if (cleanupFn) cleanupFn(); };
  }, [userId]);

  // NEW: Re-register user when userId becomes available AFTER socket was already connected
  useEffect(() => {
    if (socketRef.current && userId && socketRef.current.connected) {
      console.log('[ChatContext] userId now available, emitting register_user for:', userId);
      socketRef.current.emit('register_user', { user_id: userId });

      if (selectedConversationRef.current?.ConversationID) {
        socketRef.current.emit('join_conversation', {
          conversation_id: selectedConversationRef.current.ConversationID,
          user_id: userId
        });
      }
    }
  }, [socket, userId]);

  useEffect(() => {
    if (userId) {
      fetchConversations();
    }
  }, [userId]);

  return (
    <ChatContext.Provider value={{
      conversations,
      selectedConversation,
      messages,
      loading,
      socket,
      userId,
      onlineUsers,
      lastSeenByUser,
      selectConversation,
      joinConversation,
      fetchConversations,
      sendMessage,
      markAsRead,
      uploadFile
    }}>
      {children}
    </ChatContext.Provider>
  );
};
export const useChatContext = () => {
  const context = useContext(ChatContext);
  
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  
  return context;
};
export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
export { ChatContext };