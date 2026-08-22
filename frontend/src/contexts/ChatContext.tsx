import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Conversation {
  ConversationID: string;
  CName: string | null;
  IsGroup: boolean;
  Participants: string[];
  LastMessage?: {
    Content: string | null;
    SentAt: string | null;
    SenderID: string | null;
  };
}

interface Message {
  MessageID: string;
  MConversationID: string;     // Match DB
  SenderID: string;
  MContent: string;            // Match DB
  SentAt: string;
  IsRead: boolean;
  FileURL?: string;
  FileName?: string;
}

interface ChatContextType {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  socket: Socket | null;
  userId: string | null;
  onlineUsers: Set<string>;
  selectConversation: (conv: Conversation) => void;
  joinConversation: (conversationId: string) => void;
  fetchConversations: () => Promise<void>;
  sendMessage: (conversationId: string, content: string, fileUrl?: string, fileName?: string) => void;
  markAsRead: (conversationId: string) => void;
  uploadFile: (file: File) => Promise<{ FileURL: string; FileName: string }>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

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

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  const selectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv);
    selectedConversationRef.current = conv;
    await fetchMessages(conv.ConversationID);
    joinConversation(conv.ConversationID);
  };

  const fetchConversations = async () => {
    if (!userId) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/chat/conversations/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(res.data);
    } catch (error) {
      console.error('Failed to fetch conversations', error);
    }
  };

  const fetchMessages = async (conversationId: string) => {
  if (!userId) return;
  
  setLoading(true);
  try {
    const token = localStorage.getItem('token');
    const res = await axios.get(`/api/chat/messages/${conversationId}?user_id=${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Map DB fields to frontend-friendly if needed
    const mappedMessages = res.data.map((msg: any) => ({
      ...msg,
      ConversationID: msg.MConversationID,   // alias for easier use
      Content: msg.MContent
    }));
    
    setMessages(mappedMessages);
  } catch (error) {
    console.error('Failed to fetch messages', error);
  }
  setLoading(false);
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

  const sendMessage = async (conversationId: string, content: string, fileUrl?: string) => {
    if (!socket || !userId) {
      throw new Error('Socket is not connected or userId is missing');
    }

    const payload: any = {
      conversation_id: conversationId,
      sender_id: userId,
      content,
    };

    if (fileUrl) payload.file_url = fileUrl;

    socket.emit('send_message', payload);
    return payload;
  };
  const markAsRead = async (conversationId: string) => {
    if (!userId) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/chat/conversations/${conversationId}/read`, {}, {
        params: { user_id: userId },
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const uploadFile = async (file: File): Promise<{ FileURL: string; FileName: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('token');
    const res = await axios.post('/api/chat/upload', formData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  };
useEffect(() => {
  const checkUserId = () => {
    const studentData = localStorage.getItem('student');
    let studentId = null;

    if (studentData) {
      try {
        const parsed = JSON.parse(studentData);
        studentId = parsed.StudentID;
      } catch (e) {
        console.error('Failed to parse student data', e);
      }
    }

    if (!studentId) {
      studentId = localStorage.getItem('studentId');
    }

    if (studentId) {
      console.log('[ChatContext] Setting StudentID:', studentId);
      setUserId(studentId);
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

    console.log('[ChatContext] Socket.IO: Starting connection to:', SOCKET_URL);
    
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: localStorage.getItem('token') }
    });

    newSocket.on('connect', () => {
      console.log('[ChatContext] Socket.IO connected:', newSocket.id);
      socketRef.current = newSocket;
      newSocket.emit('register_user', { user_id: userId });

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
    });

    newSocket.on('disconnect', () => {
      console.log('[ChatContext] Socket.IO disconnected');
    });

    newSocket.on('new_message', (data: Message) => {
      console.log('[ChatContext] New message received:', data);

      const activeConversationId = selectedConversationRef.current?.ConversationID;
      if (activeConversationId === data.MConversationID) {
        setMessages((prev) => {
          if (prev.some((msg) => msg.MessageID === data.MessageID)) {
            return prev;
          }
          return [...prev, data];
        });

        axios.post(`/api/chat/conversations/${data.MConversationID}/read`, {}, {
          params: { user_id: userId },
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).catch(console.error);
      }

      fetchConversations();
    });

    newSocket.on('message_notification', (data: any) => {
      console.log('[ChatContext] Message notification:', data);
      fetchConversations();
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
    });

    newSocket.on('user_offline', (data: { user_id: string }) => {
      console.log('[ChatContext] User went offline:', data.user_id);
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.user_id);
        return newSet;
      });
    });

    setSocket(newSocket);
    socketRef.current = newSocket;

    return () => {
      if (socketRef.current === newSocket) {
        socketRef.current = null;
      }
      newSocket.disconnect();
    };
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