import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronDown, X, Loader2, ArrowRight } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api'

interface NavigationMenuProps {
  target: 'study' | 'exam';
  onSectionSelected?: (data: { 
    textbookId: string; 
    chapterId: number; 
    sectionId: string 
  }) => void;
}

const NavigationMenu: React.FC<NavigationMenuProps> = ({ target = 'study', onSectionSelected }) => {
  const navigate = useNavigate();
  const [showPopup, setShowPopup] = useState(false);
  const [textbooks, setTextbooks] = useState<any[]>([]);
  const [selectedTextbookId, setSelectedTextbookId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<number | string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [studentGrade, setStudentGrade] = useState<string>('');
  
  // NEW: State for chapters and sections
  const [chapters, setChapters] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  
  // Fetch student grade
  // Fetch student grade
useEffect(() => {
  const fetchGrade = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setStudentGrade('HIG11A');
        return;
      }

      const gradeRes = await fetch(`${API_BASE}/api/study/student-grade`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (gradeRes.status === 401) {
        console.error("Token rejected by server (401)");
        // Optional: logout user
        localStorage.removeItem('token');
        setStudentGrade('HIG11A');
        return;
      }

      if (!gradeRes.ok) throw new Error('Failed');

      const gradeData = await gradeRes.json();
      setStudentGrade(gradeData.grade || 'HIG11A');
    } catch (e) {
      console.error(e);
      setStudentGrade('HIG11A');
    }
  };

  fetchGrade();
}, []);

  // Fetch textbooks when popup opens
  useEffect(() => {
    if (showPopup && studentGrade) {
      const fetchBooks = async () => {
        setLoading(true);
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_BASE}/api/study/textbooks?grade=${studentGrade}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          console.log("Textbooks received:", data);
          setTextbooks(Array.isArray(data) ? data : []);
        } catch (e) { 
          console.error("Failed to fetch textbooks:", e);
          setTextbooks([]); 
        }
        setLoading(false);
      };
      fetchBooks();
    }
  }, [showPopup, studentGrade]);

  // NEW: Fetch chapters when a textbook is selected
  useEffect(() => {
    const fetchChapters = async () => {
      if (!selectedTextbookId) {
        setChapters([]);
        return;
      }
      
      setLoadingChapters(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/study/chapters/${selectedTextbookId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const chaptersData = await res.json();
          console.log("Chapters data for textbook:", chaptersData);
          setChapters(chaptersData);
        } else {
          console.error("Failed to fetch chapters:", res.status);
          setChapters([]);
        }
      } catch (error) {
        console.error("Error fetching chapters:", error);
        setChapters([]);
      }
      setLoadingChapters(false);
    };
    
    fetchChapters();
  }, [selectedTextbookId]);

  // NEW: Fetch sections when a chapter is selected
  useEffect(() => {
    const fetchSections = async () => {
      if (!selectedTextbookId || !selectedChapterId) {
        setSections([]);
        return;
      }
      
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/study/sections/${selectedTextbookId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const allSections = await res.json();
          const chapterSections = allSections.filter(
            (s: any) => String(s.chapterId) === String(selectedChapterId)
          );
          console.log("Sections for chapter:", selectedChapterId, chapterSections);
          setSections(chapterSections);
        } else {
          console.error("Failed to fetch sections:", res.status);
          setSections([]);
        }
      } catch (error) {
        console.error("Error fetching sections:", error);
        setSections([]);
      }
    };
    
    fetchSections();
    setSelectedSectionId(null);
  }, [selectedTextbookId, selectedChapterId]);

  const currentTextbook = useMemo(() => 
    textbooks.find(t => String(t.id) === String(selectedTextbookId)) || null
  , [textbooks, selectedTextbookId]);

  const handleGo = () => {
    if (!currentTextbook) return;

    const selectedChapter = chapters.find(c => String(c.chapterId) === String(selectedChapterId));
    const selectedSection = sections.find(s => String(s.sectionId) === String(selectedSectionId));
    
    const data = {
      textbookId: currentTextbook.code || currentTextbook.id,
      chapterId: selectedChapter?.chapterId || selectedChapterId || 0,
      sectionId: selectedSection?.sectionId || selectedSectionId || ''
    };

    console.log("Navigation data:", data);

    if (onSectionSelected) {
      onSectionSelected(data);
      setShowPopup(false);
    } else {
      let path = `/study/${data.textbookId}`;
      if (data.chapterId) path += `/${data.chapterId}`;
      if (data.sectionId) path += `/${data.sectionId}`;
      navigate(path);
      setShowPopup(false);
    }
  };

  // Reset selections when textbook changes
  const handleTextbookSelect = (textbookId: string) => {
    setSelectedTextbookId(textbookId);
    setSelectedChapterId(null);
    setSelectedSectionId(null);
    setChapters([]);
    setSections([]);
  };

  return (
    <>
      <button 
        onClick={() => setShowPopup(true)} 
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors text-[13px] font-medium"
      >
        <BookOpen className="h-4 w-4" /> 
        <span>Study</span> 
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {showPopup && createPortal(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="p-5 border-b flex justify-between items-center bg-white dark:bg-gray-900">
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                  {target === 'exam' ? 'Start Exam' : 'Study Materials'}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Select a textbook, then chapter, then section
                </p>
              </div>
              <button 
                onClick={() => setShowPopup(false)} 
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Three Column Layout */}
            <div className="flex flex-1 overflow-hidden bg-gray-100 dark:bg-gray-800">
              {/* Textbooks Column */}
              <div className="w-1/3 border-r overflow-y-auto p-4 bg-white dark:bg-gray-900 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Textbooks</p>
                {loading ? (
                  <div className="flex justify-center py-10"><Loader2 className="animate-spin h-6 w-6 text-indigo-600 dark:text-indigo-400" /></div>
                ) : (
                  <div className="space-y-2">
                    {textbooks.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleTextbookSelect(t.id)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                          String(selectedTextbookId) === String(t.id)
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                        }`}
                      >
                        <div className="font-bold">{t.name}</div>
                        <div className={`text-xs mt-1 ${String(selectedTextbookId) === String(t.id) ? 'text-indigo-100' : 'text-gray-500 dark:text-gray-400'}`}>
                          {t.subject} - Grade {t.grade}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Chapters Column */}
              <div className="w-1/3 border-r overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Chapters</p>
                {selectedTextbookId ? (
                  loadingChapters ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin h-6 w-6 text-indigo-600 dark:text-indigo-400" /></div>
                  ) : chapters.length > 0 ? (
                    <div className="space-y-2">
                      {chapters.map((c) => (
                        <button
                          key={c.chapterId}
                          onClick={() => setSelectedChapterId(c.chapterId)}
                          className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                            String(selectedChapterId) === String(c.chapterId)
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                          }`}
                        >
                          <div className="font-bold text-sm">Chapter {c.chapterId}</div>
                          <div className={`text-xs truncate ${String(selectedChapterId) === String(c.chapterId) ? 'text-indigo-100' : 'text-gray-500 dark:text-gray-400'}`}>
                            {c.title}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 dark:text-gray-500 py-10 text-sm">No chapters found</p>
                  )
                ) : (
                  <p className="text-center text-gray-400 dark:text-gray-500 py-10 text-sm">Select a textbook first</p>
                )}
              </div>

              {/* Sections Column */}
              <div className="w-1/3 overflow-y-auto p-4 bg-white dark:bg-gray-900">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Sections</p>
                {selectedChapterId ? (
                  sections.length > 0 ? (
                    <div className="space-y-2">
                      {sections.map((s) => (
                        <button
                          key={s.sectionId}
                          onClick={() => setSelectedSectionId(s.sectionId)}
                          className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                            String(selectedSectionId) === String(s.sectionId)
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                          }`}
                        >
                          <div className="font-bold text-sm">{s.title}</div>
                          <div className={`text-xs truncate ${String(selectedSectionId) === String(s.sectionId) ? 'text-indigo-100' : 'text-gray-500 dark:text-gray-400'}`}>
                            Page {s.startPage || '?'}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 dark:text-gray-500 py-10 text-sm">No sections found</p>
                  )
                ) : (
                  <p className="text-center text-gray-400 dark:text-gray-500 py-10 text-sm">Select a chapter first</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-white dark:bg-gray-900 dark:border-gray-700 flex justify-between items-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {currentTextbook && (
                  <span>
                    Selected: {currentTextbook.name}
                    {selectedChapterId && ` → Chapter ${selectedChapterId}`}
                    {selectedSectionId && ` → Section ${selectedSectionId}`}
                  </span>
                )}
              </div>
              <button
                onClick={handleGo}
                disabled={!selectedTextbookId}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 transition-all flex items-center gap-2 shadow-lg"
              >
                {target === 'exam' ? 'Start Exam' : 'Go to Study'} 
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default NavigationMenu;