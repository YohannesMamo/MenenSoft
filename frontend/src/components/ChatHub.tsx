import { useState, useEffect, useRef,useMemo, useCallback } from 'react';
import {
  MessageSquare, Users, Hash, User as UserIcon, Paperclip,
  X, Plus, Search, Check
} from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import axios from 'axios';

// ===================== TYPES =====================
interface Student {
  StudentID: string;
  DisplayName: string;
  IsOnline?: boolean;
  LastSeen?: string | null;
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

// ===================== CONVERSATION ITEM COMPONENT =====================
const ConversationItem = ({ 
  conv, 
  isActive, 
  onClick, 
  getConversationName, 
  currentUserId, 
  isOnline = false 
}: any) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl transition-all flex items-center gap-3 ${
        isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-indigo-900/50' : 'hover:bg-slate-50 dark:hover:bg-gray-800 text-slate-600 dark:text-gray-300'
      }`}
    >
      <div className="relative flex-shrink-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
          isActive ? 'bg-white/20' : 'bg-indigo-600 dark:bg-indigo-700'
        }`}>
          {getConversationName(conv)[0]?.toUpperCase()}
        </div>
        {isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold tracking-tight text-sm truncate">
          {getConversationName(conv)}
        </div>
        {conv.LastMessage?.Content && (
          <p className="text-xs truncate mt-1 opacity-70">
            {conv.LastMessage.SenderID === currentUserId ? 'You: ' : ''}
            {conv.LastMessage.Content.startsWith('/files/') ? '📎 File' : conv.LastMessage.Content}
          </p>
        )}
      </div>
    </button>
  );
};

// ===================== STUDENT ITEM COMPONENT =====================
const formatLastSeen = (iso?: string | null): string => {
  if (!iso) return 'Offline';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'Active just now';
  if (diff < 3600) return `Active ${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `Active ${Math.floor(diff / 3600)}h ago`;
  return `Active ${Math.floor(diff / 86400)}d ago`;
};

const OnlineUserItem = ({ user, isOnline, lastSeen, onClick }: { user: Student; isOnline: boolean; lastSeen?: string | null; onClick: () => void }) => {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-all group"
    >
      <div className="relative">
        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-lg font-bold group-hover:bg-indigo-600 transition-colors">
          {user.DisplayName[0]?.toUpperCase()}
        </div>
        {isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900" />}
        {!isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-slate-500 rounded-full border-2 border-slate-900" />}
      </div>
      <div className="text-left min-w-0">
        <p className="font-semibold tracking-tight truncate">{user.DisplayName}</p>
        <p className={`text-xs ${isOnline ? 'text-emerald-400' : 'opacity-50'}`}>
          {isOnline ? 'Online now' : formatLastSeen(lastSeen)}
        </p>
      </div>
    </button>
  );
};

// ===================== EMPTY STATE COMPONENT =====================
const EmptyState = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-12">
      <div className="w-32 h-32 bg-indigo-50 dark:bg-indigo-900/30 rounded-[40px] flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-8">
        <MessageSquare className="w-16 h-16" />
      </div>
      <h2 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">Student Connectivity Hub</h2>
      <p className="text-slate-500 dark:text-slate-400 mt-4 max-w-sm">Connect with peers, join study groups, and collaborate in real-time.</p>
    </div>
  );
};

// ===================== NEW CHAT MODAL COMPONENT =====================
const NewChatModal = ({
  show, 
  onClose, 
  isCreatingGroup, 
  setIsCreatingGroup, 
  groupName, 
  setGroupName,
  newChatSearch, 
  setNewChatSearch, 
  filteredUsers, 
  selectedUsers,
  toggleUserSelection, 
  handleCreateConversation, 
  isLoadingUsers, 
  onlineUsers
}: any) => {
  // If modal is not shown, return null
  if (!show) return null;

  // Debug: Log selected users when they change
  useEffect(() => {
    console.log('Selected users in modal:', selectedUsers);
  }, [selectedUsers]);

  const handleUserToggle = (userId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Toggling user:', userId, 'Current selected:', selectedUsers);
    toggleUserSelection(userId);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" 
         onClick={(e) => {
           if (e.target === e.currentTarget) onClose();
         }}>
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">New Conversation</h3>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }} 
            className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* Group Chat Toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isCreatingGroup}
              onChange={(e) => {
                e.stopPropagation();
                setIsCreatingGroup(e.target.checked);
              }}
              className="w-5 h-5 text-indigo-600 rounded cursor-pointer"
            />
            <span className="font-medium">Create Group Chat</span>
          </label>

          {/* Group Name Input */}
          {isCreatingGroup && (
            <input
              type="text"
              value={groupName}
              onChange={(e) => {
                e.stopPropagation();
                setGroupName(e.target.value);
              }}
              placeholder="Group name (optional)"
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search students..."
              value={newChatSearch}
              onChange={(e) => {
                e.stopPropagation();
                setNewChatSearch(e.target.value);
              }}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* User List */}
<div className="border border-slate-200 dark:border-gray-700 rounded-2xl max-h-64 overflow-y-auto">
  {isLoadingUsers ? (
    <div className="p-8 text-center">
      <div className="animate-spin mx-auto h-6 w-6 border-b-2 border-indigo-600 rounded-full" />
    </div>
  ) : !Array.isArray(filteredUsers) || filteredUsers.length === 0 ? (
    <div className="p-8 text-center text-slate-400 dark:text-slate-500">No students found</div>
  ) : (
    filteredUsers.map((user: Student) => {
      // Safe guard against missing fields
      const studentId = user?.StudentID;
      const displayName = user?.DisplayName || "Unknown Student";

      const isSelected = Array.isArray(selectedUsers) && selectedUsers.includes(studentId);
      const isOnline = onlineUsers instanceof Set && onlineUsers.has(studentId);
      
      return (
        <button
          key={studentId}
          onClick={(e) => handleUserToggle(studentId, e)}
          className={`w-full flex items-center gap-4 p-4 border-b last:border-0 transition-colors ${
            isSelected ? 'bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50' : 'hover:bg-slate-50 dark:hover:bg-gray-800'
          }`}
          type="button"
        >
          <div className="relative flex-shrink-0">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold transition-colors ${
              isSelected ? 'bg-indigo-600' : 'bg-slate-400 dark:bg-slate-600'
            }`}>
              {isSelected ? <Check className="w-5 h-5" /> : displayName.charAt(0).toUpperCase()}
            </div>
            {isOnline && (
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
            )}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="font-semibold text-slate-800 dark:text-white truncate">{displayName}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {isOnline ? '?? Online' : '? Offline'}
            </p>
          </div>
          {isSelected && (
            <div className="flex-shrink-0">
              <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            </div>
          )}
        </button>
      );
    })
  )}
</div>
          
          {/* Selection Counter */}
          <div className="text-xs text-slate-400 dark:text-slate-500 text-center">
            Selected: {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t dark:border-gray-700 flex-shrink-0 bg-slate-50 dark:bg-gray-800">
          {selectedUsers.length > 0 ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCreateConversation();
              }}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50"
              type="button"
            >
              Start {isCreatingGroup ? 'Group' : 'Chat'} ({selectedUsers.length} {selectedUsers.length === 1 ? 'person' : 'people'})
            </button>
          ) : (
            <p className="text-center text-slate-400 dark:text-slate-500 text-sm py-2 select-none">
              👆 Select at least one student to start chatting
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ===================== MAIN CHAT HUB COMPONENT =====================
export const ChatHub = () => {
  const chat = useChat();
  const { userId: contextUserId } = chat;   // This should now be StudentID

  const currentUserId = contextUserId ||
    localStorage.getItem('studentId') ||
    localStorage.getItem('userId') ||
    (() => {
      const student = localStorage.getItem('student');
      if (student) {
        try {
          const parsed = JSON.parse(student);
          return parsed.StudentID || parsed.studentId || parsed.UserID || null;
        } catch {}
      }
      return null;
    })();

  console.log('[ChatHub] Context StudentID:', contextUserId);
  console.log('[ChatHub] Final currentUserId (StudentID):', currentUserId);

  const {
    conversations,
    selectedConversation,
    messages: contextMessages,
    loading,
    onlineUsers,
    lastSeenByUser,
    selectConversation,
    sendMessage,
    uploadFile,
    fetchConversations,
  } = chat;

  // ===== State =====
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<Student[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [newChatSearch, setNewChatSearch] = useState('');
  const [studentsSearch, setStudentsSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ===== Refs =====
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Option B: Get from localStorage with proper fallback
  // ===== User Data =====
  // ===== Debug =====
  useEffect(() => {
    console.log('Selected users state:', selectedUsers);
  }, [selectedUsers]);

  // ===== Auto Scroll =====
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [contextMessages]);

 // ===== Load Users =====
const loadAvailableUsers = async () => {
  setIsLoadingUsers(true);
  try {
    const token = localStorage.getItem('token');
    const res = await axios.get('/api/chat/students', { 
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Safeguard: Ensure res.data is an array before filtering
    const dataArray = Array.isArray(res.data) ? res.data : [];
    
    setAvailableUsers(dataArray.filter((u: Student) => u.StudentID !== currentUserId));
  } catch (e) {
    console.error("Failed to load available users:", e);
  } finally {
    setIsLoadingUsers(false);
  }
};
  useEffect(() => { loadAvailableUsers(); }, []);
  useEffect(() => { if (showNewChatModal) loadAvailableUsers(); }, [showNewChatModal]);

  // ===== Socket Listener =====
  // Socket listeners are handled centrally in ChatContext; this component consumes contextMessages.

  // ===== Helper Functions =====
  const getConversationName = (conv: any) => {
    if (conv?.CName) return conv.CName;
    if (conv?.Name) return conv.Name;    // Fallback for backward compatibility
    const others = conv?.Participants?.filter((p: string) => p !== currentUserId) || [];
    const user = availableUsers.find(u => u.StudentID === others[0]);
    return user?.DisplayName || 'Unknown Chat';
  };

  // ===== Toggle User Selection =====
  const toggleUserSelection = useCallback((userId: string) => {
    console.log('Toggle user called for:', userId);
    console.log('Current selected users:', selectedUsers);
    
    setSelectedUsers(prev => {
      const isSelected = prev.includes(userId);
      let newSelection;
      
      if (isSelected) {
        // Remove user
        newSelection = prev.filter(id => id !== userId);
        console.log('Removing user:', userId);
      } else {
        // Add user
        newSelection = [...prev, userId];
        console.log('Adding user:', userId);
      }
      
      console.log('New selection:', newSelection);
      return newSelection;
    });
  }, [selectedUsers]);

  // ===== Send Message =====
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    setErrorMessage(null);
    
    // Validate prerequisites
    if (!selectedConversation || !currentUserId) {
      const msg = 'Cannot send message: Missing conversation or user ID';
      console.warn(msg);
      setErrorMessage(msg);
      return;
    }
    
    // Validate message content
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage && !selectedFile) {
      const msg = 'Message cannot be empty. Please type a message or select a file.';
      console.warn(msg);
      setErrorMessage(msg);
      return;
    }

    let fileUrl = undefined;

    // Upload file if selected
    if (selectedFile && fileInputRef.current?.files?.[0]) {
      setIsUploading(true);
      try {
        const result = await uploadFile(fileInputRef.current.files[0]);
        fileUrl = result.FileURL;
        console.log('File uploaded successfully:', fileUrl);
      } catch (err) {
        console.error('File upload failed:', err);
        const errorMsg = err instanceof Error ? err.message : 'File upload failed. Please try again.';
        setErrorMessage(errorMsg);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    // Send message
    try {
      await sendMessage(selectedConversation.ConversationID, trimmedMessage, fileUrl);
      console.log('Message sent successfully');
      
      // Clear form after successful send
      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to send message. Please try again.';
      setErrorMessage(errorMsg);
      // Message stays in input for user to retry
    }
  };

  // ===== File Handling =====
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedFile({
        name: file.name,
        type: file.type,
        size: file.size,
        data: event.target?.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  // ===== Create Conversation =====


 const handleCreateConversation = async () => {
    console.log('Creating conversation with users:', selectedUsers);

    if (selectedUsers.length === 0) {
      console.warn('No users selected');
      return;
    }

    if (!currentUserId) {
      console.error('Current user ID is still missing!', { contextUserId });
      alert('User ID not found. Please refresh the page and try again.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      const conversationData = {
        Name: isCreatingGroup ? groupName || `Group Chat (${selectedUsers.length + 1})` : null,
        CName: isCreatingGroup ? groupName || `Group Chat (${selectedUsers.length + 1})` : null,
        IsGroup: isCreatingGroup && selectedUsers.length > 1,
        ParticipantIDs: Array.from(new Set([currentUserId, ...selectedUsers]))
      };

      console.log('✅ Using currentUserId:', currentUserId);
      console.log('📤 Sending:', JSON.stringify(conversationData, null, 2));

      const res = await axios.post('/api/chat/conversations', conversationData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // ==================== SUCCESS HANDLING ====================
      if (res.data && res.data.ConversationID) {
        const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');

        const newConversation = {
          ...res.data,
          Participants: Array.from(new Set([currentUserId, ...selectedUsers])),
          CreatedAt: new Date().toISOString()
        };

        conversations.push(newConversation);
        localStorage.setItem('conversations', JSON.stringify(conversations));

        handleModalClose();
        await fetchConversations();

        const newConv = {
          ConversationID: res.data.ConversationID,
          CName: res.data.Name || res.data.CName,
          IsGroup: res.data.IsGroup,
          Participants: res.data.ParticipantIDs || Array.from(new Set([currentUserId, ...selectedUsers])),
        };

        selectConversation(newConv);
      }
      // ========================================================

    } catch (error) {
      console.error('Failed to create conversation:', error);
      alert('Failed to create conversation. Please try again.');
    }
};
  // ===== Modal Close Handler =====
  const handleModalClose = () => {
    setShowNewChatModal(false);
    setSelectedUsers([]);
    setIsCreatingGroup(false);
    setGroupName('');
    setNewChatSearch('');
  };
  // ===== Select Room =====
  const handleSelectRoom = (conv: any) => {
    if (!conv || !conv.ConversationID) return;
    setSelectedUsers([]);
    selectConversation(conv);
  };

  // ===== Filters =====
const isUserOnline = useCallback((userId: string) => 
  onlineUsers instanceof Set ? onlineUsers.has(userId) : false, 
[onlineUsers]);

const filteredConversations = useMemo(() => {
  if (!Array.isArray(conversations)) return [];
  const query = searchQuery.toLowerCase();
  return conversations.filter(conv =>
    getConversationName(conv)?.toLowerCase().includes(query)
  );
}, [conversations, searchQuery]);

const filteredUsers = useMemo(() => {
  if (!Array.isArray(availableUsers)) return [];
  const query = newChatSearch.toLowerCase();
  return availableUsers.filter(user =>
    (user?.DisplayName || '').toLowerCase().includes(query)
  );
}, [availableUsers, newChatSearch]);

// Students for the side panel: merge live presence, sort online-first, filter by search
const panelStudents = useMemo(() => {
  if (!Array.isArray(availableUsers)) return [];
  const query = studentsSearch.toLowerCase();
  return availableUsers
    .map(user => ({
      ...user,
      IsOnline: onlineUsers instanceof Set ? onlineUsers.has(user.StudentID) : !!user.IsOnline,
      LastSeen: lastSeenByUser[user.StudentID] || user.LastSeen || null,
    }))
    .filter(user => (user?.DisplayName || '').toLowerCase().includes(query))
    .sort((a, b) => {
      if (a.IsOnline !== b.IsOnline) return a.IsOnline ? -1 : 1;
      return (a.DisplayName || '').localeCompare(b.DisplayName || '');
    });
}, [availableUsers, studentsSearch, onlineUsers, lastSeenByUser]);

  // ===== RENDER =====
  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-100 dark:bg-gray-900 gap-6 p-6 overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-80 flex flex-col gap-6 h-full">
        {/* Conversations List */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-slate-200 dark:border-gray-700 shadow-sm flex-[7] min-h-0 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">Study Channels</h3>
            </div>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-xl text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-all"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="mb-4 px-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-200">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500">No conversations yet</div>
            ) : (
              <>
                {/* Groups */}
                {filteredConversations.filter(c => c.IsGroup).length > 0 && (
                  <>
                    <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 px-2">Groups</div>
                    {filteredConversations.filter(c => c.IsGroup).map(conv => (
                      <ConversationItem
                        key={conv.ConversationID}
                        conv={conv}
                        isActive={selectedConversation?.ConversationID === conv.ConversationID}
                        onClick={() => handleSelectRoom(conv)}
                        getConversationName={getConversationName}
                        currentUserId={currentUserId}
                      />
                    ))}
                  </>
                )}

                {/* Recent Chats */}
                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-8 mb-3 px-2">Recent Chats</div>
                {filteredConversations.filter(c => !c.IsGroup).map(conv => {
                  const otherId = conv.Participants?.find((p: string) => p !== currentUserId);
                  return (
                    <ConversationItem
                      key={conv.ConversationID}
                      conv={conv}
                      isActive={selectedConversation?.ConversationID === conv.ConversationID}
                      onClick={() => handleSelectRoom(conv)}
                      getConversationName={getConversationName}
                      currentUserId={currentUserId}
                      isOnline={isUserOnline(otherId || '')}
                    />
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Students */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-2xl flex-[3] min-h-0 flex flex-col overflow-hidden relative">
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-10 pointer-events-none" />
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="text-xs font-black uppercase tracking-widest opacity-70">
                  Students <span className="text-emerald-400">({panelStudents.filter(s => s.IsOnline).length} online)</span>
                </h3>
              </div>
            </div>

            <div className="relative z-10 mb-3">
              <input
                value={studentsSearch}
                onChange={(e) => setStudentsSearch(e.target.value)}
                placeholder="Search students..."
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 space-y-1">
              {panelStudents.length === 0 ? (
                <div className="text-center text-white/50 py-10">No students found</div>
              ) : (
                panelStudents.map(user => (
                  <OnlineUserItem
                    key={user.StudentID}
                    user={user}
                    isOnline={!!user.IsOnline}
                    lastSeen={user.LastSeen}
                    onClick={() => {
                      const existing = conversations.find(c =>
                        !c.IsGroup && c.Participants?.includes(user.StudentID) && c.Participants?.includes(currentUserId)
                      );
                      if (existing) handleSelectRoom(existing);
                      else {
                        setShowNewChatModal(true);
                        setSelectedUsers([user.StudentID]);
                      }
                    }}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-4xl border border-slate-200 dark:border-gray-700 shadow-sm flex flex-col overflow-hidden">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                selectedConversation.IsGroup ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 border text-indigo-600 dark:text-indigo-400'
              }`}>
                {selectedConversation.IsGroup ? <Hash className="w-6 h-6" /> : <UserIcon className="w-6 h-6" />}
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight dark:text-white">{getConversationName(selectedConversation)}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Live Chat</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-8 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                </div>
              ) : contextMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-center">
                  No messages yet.<br />Send the first one!
                </div>
              ) : (
                contextMessages.map((msg: Message) => {
                  const isMine = msg.SenderID === currentUserId;
                  return (
                    <div key={msg.MessageID} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-5 py-4 rounded-3xl ${
                        isMine ? 'bg-slate-900 text-white' : 'bg-slate-100 dark:bg-gray-900 text-slate-800 dark:text-gray-200'
                      }`}>
                        <p>{msg.MContent}</p>
                        {msg.FileURL && !isMine && (
                          <a
                            href={msg.FileURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="inline-flex items-center gap-1 text-blue-400 underline text-sm mt-2"
                          >
                            📎 Download file
                          </a>
                        )}
                        <p className="text-[10px] mt-2 opacity-70 text-right">
                          {new Date(msg.SentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-6 border-t dark:border-gray-700 bg-white dark:bg-gray-800">
              {selectedFile && (
                <div className="mb-4 p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <span className="text-xl">📎</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-white">{selectedFile.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
              {errorMessage && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-3 flex items-start gap-3">
                  <div className="text-red-600 dark:text-red-400 font-bold text-lg leading-none mt-0.5">⚠️</div>
                  <div>
                    <p className="text-sm font-semibold text-red-800 dark:text-red-200">Message Error</p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">{errorMessage}</p>
                  </div>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="text-red-400 hover:text-red-600 ml-auto flex-shrink-0 mt-0.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()} 
                  className="p-4 bg-slate-100 dark:bg-gray-900 rounded-3xl hover:bg-slate-200 dark:hover:bg-gray-700 transition"
                  disabled={isUploading}
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-6 py-4 bg-slate-100 dark:bg-gray-900 rounded-3xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button 
                  type="submit" 
                  disabled={(!newMessage.trim() && !selectedFile) || isUploading} 
                  className="px-8 py-4 bg-indigo-600 text-white rounded-3xl font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Send'}
                </button>
              </form>
            </div>
          </>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        show={showNewChatModal}
        onClose={handleModalClose}
        isCreatingGroup={isCreatingGroup}
        setIsCreatingGroup={setIsCreatingGroup}
        groupName={groupName}
        setGroupName={setGroupName}
        newChatSearch={newChatSearch}
        setNewChatSearch={setNewChatSearch}
        filteredUsers={filteredUsers}
        selectedUsers={selectedUsers}
        toggleUserSelection={toggleUserSelection}
        handleCreateConversation={handleCreateConversation}
        isLoadingUsers={isLoadingUsers}
        onlineUsers={onlineUsers}
      />
    </div>
  );
};