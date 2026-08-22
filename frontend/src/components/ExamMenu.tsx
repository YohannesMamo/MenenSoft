// src/components/ExamMenu.tsx
// A comprehensive exam selection component that allows users to choose textbooks, chapters, sections, and exam modes

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { TestTube, ChevronDown, X, Loader2, ArrowRight, Target, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const ExamMenu: React.FC = () => {
  // ============================================
  // ROUTING & NAVIGATION
  // ============================================
  const navigate = useNavigate();

  // ============================================
  // UI STATE MANAGEMENT
  // ============================================
  const [showPopup, setShowPopup] = useState(false);           // Controls modal visibility
  const [stage, setStage] = useState<'selector' | 'mode'>('selector');  // Two-step process: content selection → mode selection
  const [startingExam, setStartingExam] = useState(false);      // Loading state for exam start

// Define your premium check here (add this)
const { user } = useAuth();
const isPremium = user?.subscriptionStatus === 'Premium';
  // ============================================
  // DATA STATE - Content Selection
  // ============================================
  const [textbooks, setTextbooks] = useState<any[]>([]);        // Available textbooks
  const [chapters, setChapters] = useState<any[]>([]);          // Chapters for selected textbook
  const [sections, setSections] = useState<any[]>([]);          // Sections for selected chapter
  const [studentGrade, setStudentGrade] = useState<string>(''); // User's grade level

  // ============================================
  // DATA STATE - Selected Items
  // ============================================
  const [selectedTextbookId, setSelectedTextbookId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<number | string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<'practice' | 'exam' | null>(null);

  // ============================================
  // LOADING STATES
  // ============================================
  const [loading, setLoading] = useState(false);               // Loading textbooks
  const [loadingChapters, setLoadingChapters] = useState(false); // Loading chapters/sections
  const [loadingCounts, setLoadingCounts] = useState(false);   // Loading question counts

  // ============================================
  // QUESTION COUNTS
  // ============================================
  const [sectionQuestionCounts, setSectionQuestionCounts] = useState<Map<string, number>>(new Map());

  // ============================================
  // HELPER FUNCTIONS - Section Logic
  // ============================================
  
  // Determines if a section is a parent section (e.g., "1.1") not a subsection (e.g., "1.1.1")
  const isParentSection = (sectionId: string): boolean => {
    if (!sectionId) return false;
    const parts = sectionId.split('.');
    return parts.length === 2; // Only sections with exactly 2 parts (chapter.section)
  };

  // Extracts parent section ID from any section (e.g., "1.1.1" → "1.1")
  const getParentSectionId = (sectionId: string): string => {
    const parts = sectionId.split('.');
    if (parts.length >= 2) {
      return `${parts[0]}.${parts[1]}`;
    }
    return sectionId;
  };

  // ============================================
  // HELPER FUNCTIONS - Formatting
  // ============================================
  
  const getGradeLabel = (grade: string): string => {
    const gradeMap: Record<string, string> = {
      'HIG9A': 'Grade 9',
      'HIG10A': 'Grade 10',
      'HIG11A': 'Grade 11',
      'HIG12A': 'Grade 12'
    };
    return gradeMap[grade] || grade;
  };

  // ============================================
  // API CALLS - Data Fetching
  // ============================================

  // Fetches question counts for each section in a textbook
  const fetchQuestionCounts = async (textbookId: string, sections: any[]) => {
    if (!sections.length) return;
    
    setLoadingCounts(true);
    try {
      const token = localStorage.getItem('token');
      const countsMap = new Map();
      
      // Fetch count for each section individually
      for (const section of sections) {
        const sectionId = section.sectionId || section.id;
        try {
          const response = await fetch(
            `${API_BASE}/api/exams/question-count?textbookId=${textbookId}&sectionId=${sectionId}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          
          if (response.ok) {
            const data = await response.json();
            countsMap.set(sectionId, data.count);
          } else {
            countsMap.set(sectionId, 0);
          }
        } catch (error) {
          console.error(`Failed to fetch count for section ${sectionId}:`, error);
          countsMap.set(sectionId, 0);
        }
      }
      
      setSectionQuestionCounts(countsMap);
    } catch (error) {
      console.error("Error fetching question counts:", error);
    } finally {
      setLoadingCounts(false);
    }
  };

  // ============================================
  // EFFECTS - Event Listeners & Initial Data
  // ============================================

  // Listens for custom event to open the exam selector from anywhere in the app
  useEffect(() => {
    const handleOpenPopup = () => {
      setShowPopup(true);
    };
    
    window.addEventListener('openExamSelector', handleOpenPopup);
    return () => window.removeEventListener('openExamSelector', handleOpenPopup);
  }, []);

  // Fetches the user's grade level on component mount


 useEffect(() => {
  const fetchGrade = async () => {
    const token = localStorage.getItem('token');
    
    console.log("Token being sent:", token ? token.substring(0, 30) + "..." : "NO TOKEN");

    try {
      const gradeRes = await fetch(`${API_BASE}/api/study/student-grade`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      console.log("Student Grade Response Status:", gradeRes.status);

      if (gradeRes.status === 401) {
        const errorText = await gradeRes.text();
        console.error("401 Error Body:", errorText);
      }

      if (!gradeRes.ok) throw new Error('Failed');

      const gradeData = await gradeRes.json();
      setStudentGrade(gradeData.grade || 'HIG11A');
    } catch (e) {
      console.error("Fetch error:", e);
      setStudentGrade('HIG11A');
    }
  };

  fetchGrade();
}, []);
  // ============================================
  // EFFECTS - Popup Data Management
  // ============================================

  // Fetches textbooks when popup opens and resets all selection states
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
          console.log("ExamMenu - Textbooks received:", data);
          setTextbooks(Array.isArray(data) ? data : []);
        } catch (e) { 
          console.error("Failed to fetch textbooks:", e);
          setTextbooks([]); 
        }
        setLoading(false);
      };
      fetchBooks();
      
      // Reset all selections when popup opens
      setStage('selector');
      setSelectedTextbookId(null);
      setSelectedChapterId(null);
      setSelectedSectionId(null);
      setSelectedMode(null);
      setChapters([]);
      setSections([]);
    }
  }, [showPopup, studentGrade]);

  // ============================================
  // EFFECTS - Content Hierarchy Loading
  // ============================================

  // Fetches sections and chapters when a textbook is selected
  useEffect(() => {
    const fetchChapters = async () => {
      if (!selectedTextbookId) {
        setChapters([]);
        return;
      }
      
      setLoadingChapters(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/study/sections/${selectedTextbookId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const sectionsData = await res.json();
          console.log("ExamMenu - Sections data for textbook:", sectionsData);
          
          // Filter to ONLY parent sections (e.g., "1.1", not "1.1.1")
          const parentSections = sectionsData.filter((section: any) => {
            const sectionId = section.sectionId || section.id;
            return isParentSection(sectionId);
          });
          
          console.log("ExamMenu - Filtered parent sections:", parentSections);

          // Group sections by chapterId
          const chaptersMap = new Map();
          sectionsData.forEach((section: any) => {
            const chapterId = section.chapterId;
            if (!chaptersMap.has(chapterId)) {
              chaptersMap.set(chapterId, {
                id: chapterId,
                number: chapterId,
                title: `Chapter ${chapterId}`,
                sections: []
              });
            }
            chaptersMap.get(chapterId).sections.push(section);
          });
          
          const chaptersList = Array.from(chaptersMap.values());
          console.log("ExamMenu - Grouped chapters:", chaptersList);
          setChapters(chaptersList);
          
          // Fetch question counts for parent sections
          await fetchQuestionCounts(selectedTextbookId, parentSections);
        } else {
          console.error("Failed to fetch sections:", res.status);
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

  // Loads sections when a chapter is selected
  useEffect(() => {
    if (selectedChapterId && chapters.length > 0) {
      const chapter = chapters.find(c => String(c.id) === String(selectedChapterId));
      setSections(chapter?.sections || []);
      setSelectedSectionId(null);
    } else {
      setSections([]);
    }
  }, [selectedChapterId, chapters]);

  // ============================================
  // MEMOIZED VALUES
  // ============================================
  
  const currentTextbook = useMemo(() => 
    textbooks.find(t => String(t.id) === String(selectedTextbookId)) || null
  , [textbooks, selectedTextbookId]);

  const currentChapter = useMemo(() => 
    chapters.find(c => String(c.id) === String(selectedChapterId)) || null
  , [chapters, selectedChapterId]);

  // ============================================
  // EVENT HANDLERS
  // ============================================

  const handleTextbookSelect = (textbookId: string) => {
    setSelectedTextbookId(textbookId);
    setSelectedChapterId(null);
    setSelectedSectionId(null);
    setChapters([]);
    setSections([]);
  };

  const handleContinueToMode = () => {
    if (!selectedTextbookId) return;
    setStage('mode');
  };

  const handleBack = () => {
    setStage('selector');
    setSelectedMode(null);
  };

  const handleStartExam = async () => {
    if (!currentTextbook || !selectedMode) return;
    
    // Validate and auto-correct subsection selection
    if (selectedSectionId && !isParentSection(selectedSectionId)) {
      const parentSectionId = getParentSectionId(selectedSectionId);
      const warningMessage = `"${selectedSectionId}" is a subsection. Using parent section "${parentSectionId}" for questions.`;
      console.warn(warningMessage);
      alert(warningMessage);
      setSelectedSectionId(parentSectionId);
      return; // Let user click again with corrected section
    }
    
    setStartingExam(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/exams/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          textbookId: currentTextbook.code,
          chapterId: currentChapter?.number || 0,
          sectionId: selectedSectionId || '',
        }),
      });

      if (!response.ok) throw new Error('Failed to start exam');

      const result = await response.json();
      
      setShowPopup(false);
      
      // Navigate to appropriate exam page based on mode
      if (selectedMode === 'practice') {
        navigate('/exam/practice', { 
          state: { 
            sessionId: result.sessionId,
            sectionInfo: {
              textbookName: currentTextbook.name,
              textbookId: currentTextbook.code,
              chapterId: currentChapter?.number,
              sectionId: selectedSectionId
            }
          } 
        });
      } else {
        navigate('/exam/formal', { 
          state: { 
            sessionId: result.sessionId,
            sectionInfo: {
              textbookName: currentTextbook.name,
              textbookId: currentTextbook.code,
              chapterId: currentChapter?.number,
              sectionId: selectedSectionId
            }
          } 
        });
      }
      
    } catch (err) {
      alert('Failed to start exam. Please try again.');
    } finally {
      setStartingExam(false);
    }
  };
// Add this handler (add this)
const handleExamClick = () => {
  if (isPremium) {
    setShowPopup(true);
  }
};
  
  
  // ============================================
  // RENDER - Component UI
  // ============================================

  return (
    <>
      {/* Menu Button - Triggers the exam selector popup */}
    <button 
  disabled={!isPremium}
  onClick={handleExamClick}
  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium text-[13px] transition-colors ${
    isPremium 
      ? "text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800" 
      : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-gray-700"
  }`}
>
  <TestTube className="h-4 w-4" />
  <span>Exam</span>
  <ChevronDown className="h-3.5 w-3.5" />
  {!isPremium && (
    <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 dark:text-gray-400 px-1.5 py-0.5 rounded-full">Free</span>
  )}
  {isPremium && (
    <span className="ml-2 text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded-full">Pro</span>
  )}
</button>

      {/* Popup Modal - Portal renders at document body for correct fixed positioning */}
      {showPopup && createPortal(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl dark:shadow-gray-800/50 w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-900">
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-300">
                  {stage === 'selector' ? 'Select Content' : 'Choose Exam Mode'}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stage === 'selector' 
                    ? `${getGradeLabel(studentGrade)} - Select textbook, chapter, and section`
                    : 'Choose how you want to practice'}
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowPopup(false);
                  setStage('selector');
                }} 
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Stage 1: Content Selection (Textbook → Chapter → Section) */}
            {stage === 'selector' ? (
              <div className="flex flex-1 overflow-hidden bg-gray-100 dark:bg-gray-800">
                {/* Textbooks Column */}
                <div className="w-1/3 border-r dark:border-gray-700 overflow-y-auto p-4 bg-white dark:bg-gray-900">
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
                            {t.subject}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Chapters Column */}
                <div className="w-1/3 border-r dark:border-gray-700 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Chapters</p>
                  {selectedTextbookId ? (
                    loadingChapters ? (
                      <div className="flex justify-center py-10"><Loader2 className="animate-spin h-6 w-6 text-indigo-600 dark:text-indigo-400" /></div>
                    ) : chapters.length > 0 ? (
                      <div className="space-y-2">
                        {chapters.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setSelectedChapterId(c.id)}
                            className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                              String(selectedChapterId) === String(c.id)
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                            }`}
                          >
                            <div className="font-bold text-sm">Chapter {c.number}</div>
                            <div className={`text-xs truncate ${String(selectedChapterId) === String(c.id) ? 'text-indigo-100' : 'text-gray-500 dark:text-gray-400'}`}>
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
                  
                  {/* Chapter Statistics Summary */}
                  {selectedChapterId && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                          📊 Chapter Statistics
                        </span>
                        <span className="text-sm text-blue-600 dark:text-blue-400">
                          {sections.filter(s => isParentSection(s.sectionId || s.id)).length} sections
                        </span>
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Total Questions Available: {
                          sections
                            .filter(s => isParentSection(s.sectionId || s.id))
                            .reduce((sum, s) => sum + (sectionQuestionCounts.get(s.sectionId || s.id) || 0), 0)
                        }
                      </div>
                    </div>
                  )}
                 
                  {/* Sections List */}
                  {selectedChapterId ? (
                    sections.length > 0 ? (
                      <div className="space-y-2">
                        {sections.map((s) => {
                          const sectionId = s.sectionId || s.id;
                          const isSubsection = !isParentSection(sectionId);
                          const questionCount = sectionQuestionCounts.get(sectionId) || 0;
                          const isLoadingCount = loadingCounts;
                          
                          // Skip rendering subsections entirely
                          if (isSubsection) return null;
                          
                          return (
                            <button
                              key={sectionId}
                              onClick={() => !isSubsection && setSelectedSectionId(sectionId)}
                              disabled={isSubsection}
                              className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                                String(selectedSectionId) === String(sectionId)
                                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                              } ${isSubsection ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-bold text-sm">
                                    {s.title || `Section ${sectionId}`}
                                  </div>
                                  <div className={`text-xs truncate mt-1 ${
                                    String(selectedSectionId) === String(sectionId) 
                                      ? 'text-indigo-100' 
                                      : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                    Page {s.startPage || '?'}
                                  </div>
                                </div>
                                
                                {/* Question Count Badge */}
                                {!isSubsection && (
                                  <div className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                                    String(selectedSectionId) === String(sectionId)
                                      ? 'bg-indigo-500 text-white'
                                      : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                                  }`}>
                                    {isLoadingCount ? '...' : `${questionCount} Qs`}
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-gray-400 dark:text-gray-500 py-10 text-sm">No sections found</p>
                    )
                  ) : (
                    <p className="text-center text-gray-400 dark:text-gray-500 py-10 text-sm">Select a chapter first</p>
                  )}
                </div>
              </div>
            ) : (
              /* Stage 2: Exam Mode Selection */
              <div className="flex-1 overflow-y-auto p-6 bg-gray-100 dark:bg-gray-800">
                <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                  {/* Practice Mode Card */}
                  <button
                    onClick={() => setSelectedMode('practice')}
                    className={`p-6 rounded-2xl border-2 transition-all text-left ${
                      selectedMode === 'practice'
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-3 rounded-xl ${selectedMode === 'practice' ? 'bg-emerald-500' : 'bg-emerald-100 dark:bg-emerald-900/40'}`}>
                        <Target className="h-6 w-6" />
                      </div>
                      <span className="font-bold text-xl">Practice Mode</span>
                    </div>
                    <p className={`text-sm mb-4 ${selectedMode === 'practice' ? 'text-emerald-100' : 'text-gray-500 dark:text-gray-400'}`}>
                      Learn as you go with instant feedback and explanations
                    </p>
                    <ul className="space-y-2">
                      <li className="text-sm flex items-center gap-2">✓ Instant feedback after each question</li>
                      <li className="text-sm flex items-center gap-2">✓ Detailed explanations</li>
                      <li className="text-sm flex items-center gap-2">✓ No time pressure</li>
                    </ul>
                  </button>

                  {/* Exam Mode Card */}
                  <button
                    onClick={() => setSelectedMode('exam')}
                    className={`p-6 rounded-2xl border-2 transition-all text-left ${
                      selectedMode === 'exam'
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-3 rounded-xl ${selectedMode === 'exam' ? 'bg-indigo-500' : 'bg-indigo-100 dark:bg-indigo-900/40'}`}>
                        <Zap className="h-6 w-6" />
                      </div>
                      <span className="font-bold text-xl">Exam Mode</span>
                    </div>
                    <p className={`text-sm mb-4 ${selectedMode === 'exam' ? 'text-indigo-100' : 'text-gray-500 dark:text-gray-400'}`}>
                      Full exam simulation. Review all answers at the end
                    </p>
                    <ul className="space-y-2">
                      <li className="text-sm flex items-center gap-2">✓ No feedback during exam</li>
                      <li className="text-sm flex items-center gap-2">✓ Submit all at the end</li>
                      <li className="text-sm flex items-center gap-2">✓ Detailed results page</li>
                    </ul>
                  </button>
                </div>
              </div>
            )}

            {/* Modal Footer with Navigation Buttons */}
            <div className="p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-900 flex justify-between items-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {stage === 'selector' ? (
                  currentTextbook && (
                    <span>
                      Selected: {currentTextbook.name}
                      {currentChapter && ` → Ch ${currentChapter.number}`}
                      {selectedSectionId && ` → Section`}
                    </span>
                  )
                ) : (
                  selectedMode && <span>Mode: {selectedMode === 'practice' ? 'Practice Mode' : 'Exam Mode'}</span>
                )}
              </div>
              <div className="flex gap-3">
                {stage === 'mode' && (
                  <button
                    onClick={handleBack}
                    className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 dark:text-gray-300 rounded-xl font-medium transition"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={stage === 'selector' ? handleContinueToMode : handleStartExam}
                  disabled={stage === 'selector' ? !selectedTextbookId : !selectedMode || startingExam}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-xl font-bold disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 transition-all flex items-center gap-2 shadow-lg"
                >
                  {startingExam ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {stage === 'selector' ? 'Continue to Mode' : 'Start Exam'}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default ExamMenu;
