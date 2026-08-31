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
  MConversationID: string;     // Match DBvvv
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
  lastSeenByUser: Record<string, string>;
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
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/chat/conversations/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setConversations(res.data);

      if (socketRef.current?.connected && userId) {
        const uniqueConversationIds = Array.from(new Set((res.data as Conversation[] || []).map((conv: Conversation) => conv.ConversationID).filter(Boolean))) as string[];
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
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/chat/messages/${conversationId}?user_id=${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

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

  const sendMessage = async (conversationId: string, content: string, fileUrl?: string) => {
    if (!socket || !userId) {
      console.error('[ChatContext] Socket not connected or userId missing', { socket: !!socket, userId });
      throw new Error('Socket is not connected or userId is missing');
    }

    console.log('[ChatContext] Sending message:', { conversationId, contentLength: content.length, fileUrl, socket_id: socket.id, socket_connected: socket.connected });

    // Create optimistic message object for immediate UI display
    const tempMessageId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticMessage: Message = {
      MessageID: tempMessageId,
      MConversationID: conversationId,
      SenderID: userId,
      MContent: content,
      SentAt: new Date().toISOString(),
      IsRead: false,
      FileURL: fileUrl
    };

    // Add to state immediately (optimistic update)
    console.log('[ChatContext] Adding optimistic message:', tempMessageId);
    setMessages((prev) => [...prev, optimisticMessage]);

    // Send via Socket.IO
    const payload: any = {
      conversation_id: conversationId,
      sender_id: userId,
      content,
    };

    if (fileUrl) payload.file_url = fileUrl;

    return new Promise<Message>((resolve, reject) => {
      let resolved = false;

      // Set up listener for server confirmation (success)
      const handleMessageSent = (data: any) => {
        if (resolved) return;
        resolved = true;
        console.log('[ChatContext] message_sent received from server:', data);
        
        if (data.success && data.message) {
          console.log('[ChatContext] Message confirmed, replacing temp ID with real ID');
          // Replace temp message with server's confirmed message
          setMessages((prev) =>
            prev.map((msg) =>
              msg.MessageID === tempMessageId 
                ? { 
                    ...msg, 
                    MessageID: data.message.MessageID,
                    SentAt: data.message.SentAt || msg.SentAt
                  } 
                : msg
            )
          );
          resolve(data.message);
        } else {
          console.error('[ChatContext] message_sent but no success flag');
          throw new Error('Server did not confirm message');
        }
      };

      // Set up listener for server errors
      const handleSocketError = (data: any) => {
        if (resolved) return;
        resolved = true;
        console.error('[ChatContext] Socket error event:', data);
        
        // Remove failed optimistic message
        setMessages((prev) => prev.filter((msg) => msg.MessageID !== tempMessageId));
        
        const errorMsg = data?.message || 'Failed to send message';
        reject(new Error(errorMsg));
      };

      // Listen for confirmation or error - use once since we expect exactly one response
      socket?.once('message_sent', handleMessageSent);
      socket?.once('error', handleSocketError);

      // Emit the message
      console.log('[ChatContext] Emitting send_message event with payload:', payload);
      socket?.emit('send_message', payload);

      // Timeout after 20 seconds - gives backend time to process
      const timeoutId = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        
        console.error('[ChatContext] Message send timeout after 20s');
        socket?.off('message_sent', handleMessageSent);
        socket?.off('error', handleSocketError);
        
        // Remove optimistic message if no confirmation
        setMessages((prev) => prev.filter((msg) => msg.MessageID !== tempMessageId));
        
        reject(new Error('Message send timeout - no response from server after 20 seconds'));
      }, 20000);

      // Clear timeout if message is confirmed
      const origResolve = resolve;
      const origReject = reject;
      
      resolve = ((msg: Message) => {
        clearTimeout(timeoutId);
        socket?.off('message_sent', handleMessageSent);
        socket?.off('error', handleSocketError);
        origResolve(msg);
      }) as any;
      
      reject = ((err: Error) => {
        clearTimeout(timeoutId);
        socket?.off('message_sent', handleMessageSent);
        socket?.off('error', handleSocketError);
        origReject(err);
      }) as any;
    });
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
        setMessages((prev) => {
          // Check if message already exists (avoid duplicates)
          const isDuplicate = prev.some((msg) => msg.MessageID === data.MessageID);
          
          if (isDuplicate) {
            console.log('[ChatContext] Message already in list, skipping duplicate');
            return prev;
          }

          // Remove any temp message with matching content from same sender
          // (optimistic message that's being replaced by server's confirmed message)
          let filtered = prev;
          if (data.SenderID === userId) {
            filtered = prev.filter((msg) => {
              const isTemp = msg.MessageID.startsWith('temp_');
              const sameContent = msg.MContent === data.MContent;
              if (isTemp && sameContent && msg.SenderID === data.SenderID) {
                console.log('[ChatContext] Removing temporary message, replaced by server confirmation');
                return false;  // Remove temp message
              }
              return true;
            });
          }

          console.log('[ChatContext] Adding message to active conversation');
          return [...filtered, data];
        });

        // Mark messages as read for current user (but not for sender's own messages)
        if (data.SenderID !== userId) {
          axios.post(`/api/chat/conversations/${data.MConversationID}/read`, {}, {
            params: { user_id: userId },
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }).catch(console.error);
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

    return () => {
      clearInterval(heartbeat);
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