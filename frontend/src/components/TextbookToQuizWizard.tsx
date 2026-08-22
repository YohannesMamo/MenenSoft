import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle, Trophy, AlertCircle, Loader } from 'lucide-react';
import axios from 'axios';
interface Section {
  stbSectionID: string;
  stbSectionTitle: string;
  isCompleted: boolean;
}

interface Chapter {
  stbChapterID: number;
  stbChapterTitle: string;
  sections: Section[];
}

interface Textbook {
  STBID: string;
  STBTitle: string;
  STBGradeID: string;
}

interface TextbookToQuizWizardProps {
  textbook: Textbook;
  onClose?: () => void;
}


const API_BASE = import.meta.env.VITE_API_URL || "/api";
const TextbookToQuizWizard: React.FC<TextbookToQuizWizardProps> = ({
  textbook,
}) => {
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(1);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [hasQuiz, setHasQuiz] = useState<boolean>(false);
  const [checkingQuiz, setCheckingQuiz] = useState<boolean>(false);
  const [startingQuiz, setStartingQuiz] = useState<boolean>(false);

  useEffect(() => {
    const fetchChapters = async () => {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      if (!token) {
        setError("Session expired. Please login again.");
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get(`${API_BASE}/api/textbooks/${encodeURIComponent(textbook.STBID)}/chapters`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (res.status === 401) throw new Error("Session expired.");
        //if (!res.ok) throw new Error("Failed to load chapters");

        const data: Chapter[] =  res.data;
        setChapters(data);
      } catch (err: any) {
        setError(err.message || "Failed to load chapters");
      } finally {
        setLoading(false);
      }
    };

    fetchChapters();
  }, [textbook.STBID]);

  const checkQuizAvailability = async (section: Section) => {
    // We now allow checking even if not completed, but we prioritize the completed status
    setCheckingQuiz(true);
    const token = localStorage.getItem('token');

    try {
      const res = await axios.get(
        `${API_BASE}api/quizzes?textbookId=${encodeURIComponent(textbook.STBID)}&sectionId=${encodeURIComponent(section.stbSectionID)}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data =  res.data;
      setHasQuiz(data.hasQuiz === true);
    } catch (err) {
      console.error("Error checking quiz:", err);
      setHasQuiz(false);
    } finally {
      setCheckingQuiz(false);
    }
  };

  const handleChapterSelect = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setStep(2);
  };

  const handleSectionSelect = (section: Section) => {
    setSelectedSection(section);
    setStep(3);
    checkQuizAvailability(section);
  };

  const handleStartQuiz = () => {
    if (!selectedSection || !selectedChapter) return;
    setStartingQuiz(true);
    const path = `/quiz/${textbook.STBID}/${selectedChapter.stbChapterID}/${selectedSection.stbSectionID}`;
    navigate(path, {
      state: {
        sectionTitle: selectedSection.stbSectionTitle,
        textbookTitle: textbook.STBTitle,
        sectionId: selectedSection.stbSectionID,
        chapterId: selectedChapter.stbChapterID
      }
    });
  };

  const goBack = () => {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white dark:bg-gray-800 rounded-3xl">
        <Loader className="animate-spin w-10 h-10 text-indigo-600 dark:text-indigo-400" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your chapters...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-3xl min-h-[400px] flex flex-col items-center justify-center">
        <AlertCircle className="mx-auto w-12 h-12 text-red-500 dark:text-red-400 mb-4" />
        <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl flex flex-col min-h-0 h-full">
      {/* Compact Header - Fixed at top */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight truncate">{textbook.STBTitle}</h1>
            <p className="text-indigo-100 text-xs font-medium">Grade {textbook.STBGradeID}</p>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${step >= s ? 'bg-white' : 'bg-white/20'}`} />
          ))}
        </div>
        <div className="flex justify-between text-[10px] uppercase tracking-wider font-bold text-indigo-100/80 mt-2">
          <span>Chapter</span>
          <span>Section</span>
          <span>Quiz</span>
        </div>
      </div>

      <div className="p-6 flex-1 overflow-y-auto custom-scroll">
        {/* Step 1: Chapters */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-xl font-bold mb-5 text-gray-800 dark:text-gray-300">Select a Chapter</h2>
            <div className="grid gap-3">
              {chapters.map((chapter) => (
                <button
                  key={chapter.stbChapterID}
                  onClick={() => handleChapterSelect(chapter)}
                  className="flex items-center gap-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 hover:border-indigo-300 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/30 rounded-2xl p-4 text-left transition-all group active:scale-[0.98] shadow-sm dark:shadow-gray-800/50 hover:shadow-md"
                >
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-xl flex items-center justify-center font-bold text-xl flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    {chapter.stbChapterID}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 dark:text-gray-300 leading-tight line-clamp-2">
                      {chapter.stbChapterTitle}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      {chapter.sections.length} sections available
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Sections */}
        {step === 2 && selectedChapter && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={goBack} className="p-2 -ml-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-all">
                <ArrowLeft size={20} />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest font-bold text-indigo-600 dark:text-indigo-400 mb-0.5">Chapter {selectedChapter.stbChapterID}</p>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-300 truncate">{selectedChapter.stbChapterTitle}</h2>
              </div>
            </div>

            <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Available Sections</h3>

            <div className="grid gap-3">
              {selectedChapter.sections.map((section) => (
                <button
                  key={section.stbSectionID}
                  onClick={() => handleSectionSelect(section)}
                  className={`flex items-center justify-between bg-white dark:bg-gray-900 border rounded-2xl p-4 text-left transition-all active:scale-[0.98] group ${
                    section.isCompleted 
                      ? 'border-emerald-100 dark:border-emerald-900 hover:border-emerald-300 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/20' 
                      : 'border-gray-100 dark:border-gray-700 hover:border-indigo-300 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/30'
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {section.isCompleted ? (
                      <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle size={16} />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-gray-700 flex-shrink-0 group-hover:border-indigo-300 transition-colors" />
                    )}
                    <div className="min-w-0">
                      <p className={`font-bold leading-tight truncate ${section.isCompleted ? 'text-emerald-900 dark:text-emerald-300' : 'text-gray-800 dark:text-gray-300'}`}>
                        {section.stbSectionTitle}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">ID: {section.stbSectionID}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Quiz */}
        {step === 3 && selectedSection && (
          <div className="text-center py-6 animate-in zoom-in-95 duration-300">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-200 dark:shadow-indigo-900/40 rotate-3 hover:rotate-0 transition-transform duration-500">
              <Trophy className="w-12 h-12 text-white" />
            </div>

            <h2 className="text-2xl font-black text-gray-800 dark:text-gray-300 mb-2 tracking-tight">Challenge Yourself!</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 max-w-xs mx-auto">
              Ready to test your knowledge on <span className="text-indigo-600 dark:text-indigo-400 font-bold">"{selectedSection.stbSectionTitle}"</span>?
            </p>

            <div className="max-w-sm mx-auto">
              {checkingQuiz ? (
                <div className="py-8 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  <Loader className="animate-spin mx-auto w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                  <p className="mt-4 text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Checking Availability</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Advisory if section not completed */}
                  {!selectedSection.isCompleted && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 text-center">
                      <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <p className="text-sm font-bold text-amber-800 dark:text-amber-400">Section Not Yet Completed</p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 leading-relaxed">
                        We recommend finishing the study material for this section first to get the best quiz experience.
                      </p>
                      <button
                        onClick={() => {
                          if (selectedChapter) {
                            navigate(`/study/${textbook.STBID}/${selectedChapter.stbChapterID}/${selectedSection.stbSectionID}`);
                          }
                        }}
                        className="mt-3 text-xs font-bold text-amber-700 dark:text-amber-400 underline hover:text-amber-800"
                      >
                        Go Study First
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleStartQuiz}
                    disabled={startingQuiz}
                    className="w-full bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white font-bold text-lg py-5 rounded-2xl shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-3"
                  >
                    {startingQuiz ? (
                      <>
                        <Loader className="animate-spin w-6 h-6" />
                        <span>Preparing Quiz...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl">🚀</span>
                        <span>Start the Quiz</span>
                      </>
                    )}
                  </button>

                  {!hasQuiz && !selectedSection.isCompleted && (
                    <div className="flex items-center gap-2 justify-center text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 py-2 px-4 rounded-xl text-xs font-medium">
                      <AlertCircle size={14} />
                      <span>Note: Practice questions will be used for this section</span>
                    </div>
                  )}

                  {!hasQuiz && selectedSection.isCompleted && (
                    <div className="flex items-center gap-2 justify-center text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 py-2 px-4 rounded-xl text-xs font-medium">
                      <AlertCircle size={14} />
                      <span>Note: Using practice questions for this section</span>
                    </div>
                  )}
                </div>
              )}

              <button 
                onClick={goBack} 
                disabled={startingQuiz}
                className="mt-8 text-sm font-bold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors uppercase tracking-widest"
              >
                ← Change Section
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TextbookToQuizWizard;