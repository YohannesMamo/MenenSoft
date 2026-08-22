// src/components/ExamMenu.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TestTube, ChevronDown, X, Loader2, ArrowRight, Target, Zap } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const ExamPage: React.FC = () => {
  const navigate = useNavigate();
  const [showPopup, setShowPopup] = useState(false);
  const [stage, setStage] = useState<'selector' | 'mode'>('selector');
  const [textbooks, setTextbooks] = useState<any[]>([]);
  const [selectedTextbookId, setSelectedTextbookId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<number | string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<'practice' | 'exam' | null>(null);
  const [loading, setLoading] = useState(false);
  const [studentGrade, setStudentGrade] = useState<string>('');
  const [startingExam, setStartingExam] = useState(false);

  // Fetch student grade
  useEffect(() => {
    const fetchGrade = async () => {
      try {
        const token = localStorage.getItem('token');
        const gradeRes = await fetch('${API_BASE}/api/study/student-grade', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const gradeData = await gradeRes.json();
        setStudentGrade(gradeData.grade || 'HIG11A');
      } catch (e) { 
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
          setTextbooks(Array.isArray(data) ? data : []);
        } catch (e) { 
          setTextbooks([]); 
        }
        setLoading(false);
      };
      fetchBooks();
      
      // Reset state when popup opens
      setStage('selector');
      setSelectedTextbookId(null);
      setSelectedChapterId(null);
      selectedSectionId !== null && setSelectedSectionId(null);
      setSelectedMode(null);
    }
  }, [showPopup, studentGrade]);

  const currentTextbook = useMemo(() => 
    textbooks.find(t => String(t.id) === String(selectedTextbookId)) || null
  , [textbooks, selectedTextbookId]);

  const chapters = useMemo(() => {
    if (!currentTextbook?.chapters) return [];
    return [...currentTextbook.chapters].sort((a, b) => (Number(a.number) || 0) - (Number(b.number) || 0));
  }, [currentTextbook]);

  const currentChapter = useMemo(() => 
    chapters.find(c => String(c.id) === String(selectedChapterId)) || null
  , [chapters, selectedChapterId]);

  const sections = useMemo(() => {
    if (!currentChapter?.sections) return [];
    return [...currentChapter.sections].sort((a, b) => {
      const aNum = String(a.number || "");
      const bNum = String(b.number || "");
      return aNum.localeCompare(bNum, undefined, { numeric: true });
    });
  }, [currentChapter]);

  const handleContinueToMode = () => {
    if (!selectedTextbookId) return;
    setStage('mode');
  };

  const handleStartExam = async () => {
    if (!currentTextbook || !selectedMode) return;

    setStartingExam(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('${API_BASE}/api/exams/start', {
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

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start exam');
      }

      const result = await response.json();
      
      // Close popup and navigate to exam session
      setShowPopup(false);
      navigate('/exam/session', { 
        state: { 
          sessionId: result.sessionId,
          mode: selectedMode,
          attemptNumber: result.attemptNumber || 1,
          sectionInfo: {
            textbookId: currentTextbook.code,
            textbookName: currentTextbook.name,
            chapterId: currentChapter?.number,
            sectionId: selectedSectionId
          }
        } 
      });
      
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start exam. Please try again.');
      console.error(err);
    } finally {
      setStartingExam(false);
    }
  };

  const handleBack = () => {
    setStage('selector');
    setSelectedMode(null);
  };

  const getGradeLabel = (grade: string) => {
    const gradeMap: Record<string, string> = {
      'HIG9A': 'Grade 9',
      'HIG10A': 'Grade 10',
      'HIG11A': 'Grade 11',
      'HIG12A': 'Grade 12'
    };
    return gradeMap[grade] || grade;
  };

  return (
    <>
      {/* This is the menu button that goes in the navigation bar */}
      <button 
        onClick={() => setShowPopup(true)} 
        className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition font-medium"
      >
        <TestTube className="h-5 w-5" />
        <span>Exam Practice</span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {/* Popup Modal */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl dark:shadow-gray-800/50 w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
            
            {/* Header */}
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

            {stage === 'selector' ? (
              // Stage 1: Textbook/Chapter/Section Selection
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
                          onClick={() => setSelectedTextbookId(t.id)}
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
                    <p className="text-center text-gray-400 dark:text-gray-500 py-10 text-sm">Select a textbook first</p>
                  )}
                </div>

                {/* Sections Column */}
                <div className="w-1/3 overflow-y-auto p-4 bg-white dark:bg-gray-900">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Sections</p>
                  {selectedChapterId ? (
                    <div className="space-y-2">
                      {sections.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setSelectedSectionId(s.id)}
                          className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                            String(selectedSectionId) === String(s.id)
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                          }`}
                        >
                          <div className="font-bold text-sm">Section {s.number}</div>
                          <div className={`text-xs truncate ${String(selectedSectionId) === String(s.id) ? 'text-indigo-100' : 'text-gray-500 dark:text-gray-400'}`}>
                            {s.title}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 dark:text-gray-500 py-10 text-sm">Select a chapter first</p>
                  )}
                </div>
              </div>
            ) : (
              // Stage 2: Mode Selection
              <div className="flex-1 overflow-y-auto p-6 bg-gray-100 dark:bg-gray-800">
                <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                  {/* Practice Mode */}
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

                  {/* Exam Mode */}
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

            {/* Footer */}
            <div className="p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-900 flex justify-between items-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {stage === 'selector' ? (
                  currentTextbook && (
                    <span>
                      Selected: {currentTextbook.name}
                      {currentChapter && ` → Ch ${currentChapter.number}`}
                      {selectedSectionId && ` → Sec ${selectedSectionId}`}
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
        </div>
      )}
    </>
  );
};

export default ExamPage;