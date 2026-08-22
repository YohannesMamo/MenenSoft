import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bug, X, ExternalLink, RefreshCw, Grid3X3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface BentoSelectionProps {
  onSelect: (textbook: any, chapter: any, section: any) => void;
  onClose: () => void;
}

const BentoSelection: React.FC<BentoSelectionProps> = () => null;

const DevMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showBentoSelection, setShowBentoSelection] = useState(false);
  const [textbooks, setTextbooks] = useState<any[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const navigate = useNavigate();
  const { token, user, login } = useAuth();

  // Fetch real textbooks for better Study links
  const fetchTextbooks = async () => {
    if (!token) return;
    setLoadingBooks(true);
    try {
      const res = await fetch('/api/study/textbooks?grade=HIG11A', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTextbooks(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch textbooks for DevMenu", err);
    } finally {
      setLoadingBooks(false);
    }
  };

  useEffect(() => {
    if (isOpen && token) fetchTextbooks();
  }, [isOpen, token]);

  const generalPages = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Student Status', path: '/student-status' },
    { name: 'Chat', path: '/chat' },
    { name: 'Exam Review', path: '/exam-review' },
  ];
  
  const handleDevLogin = () => {
    login(
      'dev-token-12345', 
      { 
        userId: 'dev-user-001', 
        email: 'dev@example.com', 
        role: 'Student', 
        studentId: 'DEV001', 
        firstName: 'Dev', 
        isProfileComplete: true 
      }
    );
    navigate('/dashboard');
    setIsOpen(false);
  };

  const examPages = [
    { name: 'Prof comp', path: '/complete-profile' },
    { name: 'Exam Formal', path: '/exam/formal' },
  ];

  const newComponents = [
    { name: 'Study Hub V2 (PDF)', path: '/study-v2/GR12BIOLOGY', color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
    { name: 'Chat Hub V2 (Socket)', path: '/chat-v2', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
  ];

  const handleBentoSelect = (textbook: any, chapter: any, section: any) => {
    console.log('Selected:', { textbook, chapter, section });
    setIsOpen(false);
    setShowBentoSelection(false);
    navigate(`/study-v2/${textbook.STBID}/${chapter.chapterId}/${section.sectionId}`);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-2xl flex items-center gap-2"
        title="Developer Tools"
      >
        <Bug size={26} />
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl shadow-2xl w-96 max-h-[85vh] overflow-hidden">
          <div className="p-4 border-b bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Bug className="text-red-600" /> Dev Menu
            </h3>
            <button onClick={() => setIsOpen(false)}>
              <X size={22} />
            </button>
          </div>

          <div className="p-4 space-y-6 overflow-auto max-h-[70vh]">

            {/* General Pages */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">GENERAL</h4>
              
              {!user && (
                <button
                  onClick={handleDevLogin}
                  className="w-full text-left px-4 py-3 mb-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl text-sm font-semibold shadow-md"
                >
                  🔑 Quick Dev Login (Bypass)
                </button>
              )}
              
              {generalPages.map(p => (
                <button
                  key={p.path}
                  onClick={() => { navigate(p.path); setIsOpen(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl flex justify-between items-center"
                >
                  {p.name}
                  <ExternalLink size={16} className="text-gray-400 dark:text-gray-500" />
                </button>
              ))}
            </div>

            {/* Exam Pages */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">EXAM PAGES</h4>
              {examPages.map(p => (
                <button
                  key={p.path}
                  onClick={() => { navigate(p.path); setIsOpen(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl flex justify-between items-center"
                >
                  {p.name}
                  <ExternalLink size={16} className="text-gray-400 dark:text-gray-500" />
                </button>
              ))}
            </div>

            {/* New Components (Under Construction) */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">NEW COMPONENTS (DEV)</h4>
              <div className="space-y-2">
                {newComponents.map(p => (
                  <button
                    key={p.path}
                    onClick={() => { navigate(p.path); setIsOpen(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl flex justify-between items-center"
                  >
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${p.color}`}>{p.name}</span>
                    <ExternalLink size={16} className="text-gray-400 dark:text-gray-500" />
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 italic">PDF viewer, bookmarks, highlights, Socket.io chat</p>
            </div>

            {/* Study Pages - Smart Links */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400">STUDY PAGES</h4>
                <button onClick={fetchTextbooks} disabled={loadingBooks}>
                  <RefreshCw size={16} className={loadingBooks ? "animate-spin" : ""} />
                </button>
              </div>

              <button
                onClick={() => setShowBentoSelection(true)}
                className="w-full text-left px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-xl text-sm font-semibold mb-3 flex items-center gap-2 shadow-md"
              >
                <Grid3X3 size={18} />
                Bento Selection (NEW!)
              </button>

              {/* Quick links to actual textbooks we have */}
              <div className="space-y-2 mb-3">
                <button
                  onClick={() => navigate('/study/GR12BIOLOGY')}
                  className="w-full text-left px-4 py-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 rounded-xl text-sm"
                >
                  📚 Study Page - Grade 12 Biology
                </button>
                <button
                  onClick={() => navigate('/study/GR10MATHEMATICS')}
                  className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-xl text-sm"
                >
                  📚 Study Page - Grade 10 Math
                </button>
              </div>
              
              {textbooks.length > 0 ? (
                textbooks.slice(0, 5).map((book: any) => (
                  <div key={book.id} className="mb-2">
                    <button
                      onClick={() => navigate(`/study/${book.code || book.id}`)}
                      className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 rounded-xl text-sm"
                    >
                      📖 {book.name || book.title} ({book.code})
                    </button>
                  </div>
                ))
              ) : (
                <button
                  onClick={() => navigate('/study/HIG11A')}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                >
                  📚 Study (HIG11A)
                </button>
              )}
            </div>
          </div>

          <div className="p-3 border-t text-xs text-center text-gray-500 dark:text-gray-400">
            Authenticated as: {user?.firstName || user?.email || 'User'}
          </div>
        </div>
      )}

      {showBentoSelection && (
        <BentoSelection
          onSelect={handleBentoSelect}
          onClose={() => setShowBentoSelection(false)}
        />
      )}
    </>
  );
};

export default DevMenu;