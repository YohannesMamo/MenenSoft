import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChemicalText } from '../lib/chemical';
import { 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  Award,
  AlertCircle,
  Home,
  CheckCircle,
  XCircle,
  X,
  Info,
  Lightbulb
} from 'lucide-react';
import { RichText } from '../lib/content';

const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api/quizzes` 
  : '/api/quizzes';


interface Question {
  questionId: string;
  text: string;
  points: number;
  difficulty: string;
  options: { label: string; text: string }[];
}

interface QuizResult {
  sessionId: string;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  totalScore: number;
  percentage: number;
  performanceLevel: string;
  attemptNumber?: number;
  timeSpent: { seconds: number; formatted: string };
  results: {
    questionId: string;
    questionText: string;
    yourAnswer: string;
    yourAnswerText: string;
    isCorrect: boolean;
    pointsEarned: number;
    maxPoints: number;
    correctAnswer: string;
    correctAnswerText: string;
    explanation: string;
    correctExplanation: string;
  }[];
}



const QuizPage: React.FC = () => {
  const { stbId, chapterId, sectionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const sectionTitle = location.state?.sectionTitle || 'Quiz';
  const textbookTitle = location.state?.textbookTitle || 'Textbook';
  
  // State
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizList, setQuizList] = useState<any[]>([]);
  const [showQuizSelector, setShowQuizSelector] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // New state for modal popup
  const [selectedQuestionForModal, setSelectedQuestionForModal] = useState<{
    index: number;
    data: QuizResult['results'][0];
  } | null>(null);

  // Load quiz list
  useEffect(() => {
    const loadQuizzes = async () => {
      console.log("[QuizPage] loadQuizzes called with stbId:", stbId, "sectionId:", sectionId);
      if (!stbId || !sectionId) {
        console.log("[QuizPage] Missing stbId or sectionId");
        return;
      }
      
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        const url = `${API_BASE}?textbookId=${stbId}&chapterId=${chapterId}&sectionId=${sectionId}`;
        console.log("[QuizPage] Fetching quizzes from:", url);
        
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log("[QuizPage] Response status:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log("[QuizPage] Quiz data received:", data);
          if (data.hasQuiz && data.quiz) {
            setQuizList([data.quiz]);
          } else {
            setError(data.message || 'No quiz available');
          }
        } else {
          const errorData = await response.json();
          console.log("[QuizPage] Error response:", errorData);
          setError(errorData.message || `Failed to load quiz (${response.status})`);
        }
      } catch (err) {
        console.error('Error loading quiz:', err);
        setError('Failed to load quiz');
      } finally {
        setLoading(false);
      }
    };
    
    loadQuizzes();
  }, [stbId, sectionId]);

  // Start quiz
  const startQuiz = async (quizId: string) => {
    console.log("[QuizPage] startQuiz called with quizId:", quizId, "stbId:", stbId, "chapterId:", chapterId, "sectionId:", sectionId);
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      const requestBody = { 
        quizID: quizId,
        textbookId: stbId,
        chapterId: chapterId ? parseInt(chapterId) : null,
        sectionId: sectionId
      };
      console.log("[QuizPage] Sending request body:", requestBody);
      
      const response = await fetch(`${API_BASE}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log("[QuizPage] startQuiz response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("[QuizPage] startQuiz received data:", data);
        console.log("[QuizPage] Questions array length:", data.questions?.length || 0);
        
        setAllQuestions(data.questions || []);
        setSessionId(data.sessionId);
        setCurrentQuestionIndex(0);
        setUserAnswers({});
        setStartTime(new Date());
        
        if (data.timeLimitMinutes) {
          setTimeRemaining(data.timeLimitMinutes * 60);
        }
        
        setQuizStarted(true);
        setShowQuizSelector(false);
        
        // Start timer
        const interval = setInterval(() => {
          setTimeRemaining(prev => {
            if (prev && prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev ? prev - 1 : null;
          });
        }, 1000);
        setTimerInterval(interval);
        
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to start quiz');
      }
    } catch (err) {
      console.error('Error starting quiz:', err);
      setError('Failed to start quiz');
    } finally {
      setLoading(false);
    }
  };

  // Handle answer selection
  const handleAnswerSelect = (questionId: string, optionLabel: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: optionLabel
    }));
  };

  // Navigation
  const goToNextQuestion = () => {
    if (currentQuestionIndex < allQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Submit all answers at once
  const submitAllAnswers = async () => {
    if (!sessionId) return;
    
    const unansweredCount = allQuestions.filter(q => !userAnswers[q.questionId]).length;
    if (unansweredCount > 0) {
      if (!confirm(`You have ${unansweredCount} unanswered question(s). Submit anyway?`)) {
        return;
      }
    }
    
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      const timeSpent = startTime ? Math.floor((new Date().getTime() - startTime.getTime()) / 1000) : 0;
      
      const answers = Object.entries(userAnswers).map(([questionId, selectedOption]) => ({
        questionId,
        selectedOption,
        responseTimeSeconds: 0
      }));
      
      const response = await fetch(`${API_BASE}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId: sessionId,
          answers: answers,
          timeSpentSeconds: timeSpent
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("[QuizPage] Quiz result received:", result);
        if (result.results && result.results.length > 0) {
          console.log("[QuizPage] First result item:", result.results[0]);
        }
        setQuizResult(result);
        setQuizFinished(true);
        setQuizStarted(false);
        
        if (timerInterval) {
          clearInterval(timerInterval);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to submit quiz');
      }
    } catch (err) {
      console.error('Error submitting quiz:', err);
      setError('Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const goBackToStudy = () => {
    navigate(`/study/${stbId}`);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Quiz Selector View
  if (showQuizSelector && !quizStarted && !quizFinished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-2xl mx-auto">
          <button onClick={goBackToStudy} className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-4">
            <ChevronLeft size={20} /> Back to Study
          </button>
          
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" /></div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg text-center">
              <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-3" />
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button onClick={goBackToStudy} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg">Return to Study</button>
            </div>
          ) : quizList.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-800/50 p-8 text-center">
              <Award className="h-16 w-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold dark:text-white">No Quiz Available</h3>
              <button onClick={goBackToStudy} className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg">Continue Studying</button>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-800/50 p-8">
              <h1 className="text-2xl font-bold text-center mb-4 dark:text-white">{sectionTitle} Quiz</h1>
              <div className="bg-slate-50 dark:bg-gray-900 rounded-lg p-4 mb-6 dark:text-gray-300">
                <h3 className="font-semibold mb-2 dark:text-white">Quiz Information:</h3>
                <ul className="space-y-2 text-sm">
                  <li>📝 Complete all questions before submitting</li>
                  <li>📊 Review detailed explanations after submission</li>
                  <li>💡 Wrong answers show why and correct explanation</li>
                </ul>
              </div>
              <button onClick={() => startQuiz(quizList[0].quizID)} className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold">
                Start Quiz
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active Quiz View
  if (quizStarted && allQuestions.length > 0 && !quizFinished) {
    const currentQ = allQuestions[currentQuestionIndex];
    const currentAnswer = userAnswers[currentQ?.questionId] || '';
    const progress = ((currentQuestionIndex + 1) / allQuestions.length) * 100;
    const answeredCount = Object.keys(userAnswers).length;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="bg-white dark:bg-gray-900 shadow-md dark:shadow-gray-800/50 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold dark:text-gray-300">{sectionTitle}</span>
              {timeRemaining !== null && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Clock size={18} />
                  <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
                </div>
              )}
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400 mt-1">
              <span>Question {currentQuestionIndex + 1} of {allQuestions.length}</span>
              <span>{answeredCount} of {allQuestions.length} answered</span>
            </div>
          </div>
        </div>
        
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-800/50 p-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-gray-300 mb-6"><RichText text={currentQ?.text || ''} /></h2>
            
            <div className="space-y-3">
              {currentQ?.options.map((option) => (
                <button
                  key={option.label}
                  onClick={() => handleAnswerSelect(currentQ.questionId, option.label)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    currentAnswer === option.label
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-200 dark:ring-indigo-900'
                      : 'border-slate-200 dark:border-gray-700 hover:border-indigo-300 hover:bg-slate-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`font-semibold w-8 h-8 flex items-center justify-center rounded-full ${
                      currentAnswer === option.label
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300'
                    }`}>
                      {option.label}
                    </span>
                    <span className="flex-1 text-slate-700 dark:text-gray-300"><RichText text={option.text} /></span>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="flex justify-between mt-8">
              <button
                onClick={goToPreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className="px-6 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-50"
              >
                Previous
              </button>
              
              {currentQuestionIndex === allQuestions.length - 1 ? (
                <button
                  onClick={submitAllAnswers}
                  disabled={submitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Submit All Answers'}
                </button>
              ) : (
                <button
                  onClick={goToNextQuestion}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Next Question
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Results View with Caramel Cards Grid
  if (quizFinished && quizResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header Stats */}
          <div className="text-center mb-8">
            <Award className="h-16 w-16 text-indigo-600 dark:text-indigo-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold dark:text-white">Quiz Results</h1>
            <p className="text-slate-600 dark:text-slate-400">{sectionTitle} - {textbookTitle}</p>
            {quizResult.attemptNumber && quizResult.attemptNumber > 1 && (
              <span className="inline-block mt-2 px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-full text-sm font-semibold">
                Attempt #{quizResult.attemptNumber}
              </span>
            )}
          </div>
          
          {/* Summary Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-800/50 p-8 mb-8 text-center">
            <div className="text-4xl font-bold mb-2 text-indigo-600 dark:text-indigo-400">{quizResult.percentage}%</div>
            <div className="text-xl mb-4 dark:text-gray-300">{quizResult.totalScore} / {quizResult.totalQuestions * 10} points</div>
            <div className="text-lg text-indigo-600 dark:text-indigo-400 mb-4">{quizResult.performanceLevel}</div>
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{quizResult.correctCount}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Correct</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{quizResult.incorrectCount}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Incorrect</div>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-3">
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{quizResult.timeSpent.formatted}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Time Spent</div>
              </div>
            </div>
          </div>
          
          <h2 className="text-xl font-bold mb-4 dark:text-white">Question Review</h2>
          
          {/* Caramel Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {quizResult.results.map((item, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedQuestionForModal({ index: idx, data: item })}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-800/50 overflow-hidden cursor-pointer transform transition-all hover:scale-105 hover:shadow-xl"
              >
                {/* Big Right or Big X Header */}
                <div className={`h-32 flex flex-col items-center justify-center ${
                  item.isCorrect ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-gradient-to-br from-red-400 to-red-600'
                }`}>
                  {item.isCorrect ? (
                    <CheckCircle className="h-16 w-16 text-white" strokeWidth={1.5} />
                  ) : (
                    <XCircle className="h-16 w-16 text-white" strokeWidth={1.5} />
                  )}
                </div>
                
                {/* Card Body */}
                <div className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-bold text-slate-700 dark:text-gray-300">Q{idx + 1}</span>
                    <span className={`text-sm font-semibold px-2 py-1 rounded ${
                      item.isCorrect ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                    }`}>
                      {item.pointsEarned}/{item.maxPoints} pts
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-gray-400 line-clamp-2">
                    <RichText text={item.questionText.length > 60 ? item.questionText.substring(0, 60) + '...' : item.questionText} />
                  </p>
                  <div className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <span>Click for explanation</span>
                    <ChevronRight size={12} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            <button onClick={() => navigate('/quiz')} className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition">
              Take Another Quiz
            </button>
            <button onClick={goBackToStudy} className="flex-1 py-3 bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-300 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-slate-300 dark:hover:bg-gray-600 transition">
              <Home size={18} /> Back to Study
            </button>
          </div>
        </div>
        
        {/* Explanation Modal Popup - Fixed Scrollbar Issue */}
        {selectedQuestionForModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedQuestionForModal(null)}
            style={{ overflow: 'hidden' }}
          >
            <div 
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl dark:shadow-gray-800/50 w-full max-w-2xl flex flex-col rounded-3xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              style={{ maxHeight: '90vh' }}
            >
              {/* Modal Header - Fixed */}
              <div className={`flex justify-between items-center p-6 rounded-3xl overflow-hidden border-b ${
                selectedQuestionForModal.data.isCorrect ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
              }`}>
                <div className="flex items-center gap-3">
                  {selectedQuestionForModal.data.isCorrect ? (
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                  )}
                  <div>
                    <h3 className="text-xl font-bold dark:text-white">Question {selectedQuestionForModal.index + 1}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {selectedQuestionForModal.data.pointsEarned}/{selectedQuestionForModal.data.maxPoints} points earned
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedQuestionForModal(null)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-gray-700 rounded-full transition flex-shrink-0"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Modal Body - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
                <div className="space-y-4">
                  {/* Question Text */}
                  <div className="bg-slate-50 dark:bg-gray-800 rounded-lg p-4">
                    <p className="font-semibold text-slate-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <Info size={16} /> Question:
                    </p>
                    <p className="text-slate-800 dark:text-gray-300"><ChemicalText text={selectedQuestionForModal.data.questionText} /></p>
                  </div>
                  
                  {/* Your Answer Section */}
                  <div className={`rounded-lg p-4 ${
                    selectedQuestionForModal.data.isCorrect ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
                  }`}>
                    <p className="font-semibold mb-2 flex items-center gap-2 dark:text-gray-300">
                      {selectedQuestionForModal.data.isCorrect ? (
                        <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle size={16} className="text-red-600 dark:text-red-400" />
                      )}
                      Your Answer:
                    </p>
                    <p className="text-slate-800 dark:text-gray-300">
                      <span className="font-mono font-bold">{selectedQuestionForModal.data.yourAnswer}.</span>{' '}
                      {selectedQuestionForModal.data.yourAnswerText}
                    </p>
                  </div>
                  
                  {/* Conditional Display for Correct vs Wrong Answers */}
                  {selectedQuestionForModal.data.isCorrect ? (
                    // CORRECT ANSWER VIEW
                    <>
                      <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4 border-l-4 border-green-600">
                        <p className="font-semibold text-green-700 dark:text-green-400 mb-2">✓ Your answer is correct!</p>
                        <div className="text-slate-700 dark:text-gray-300">
                          <p className="font-medium">Explanation:</p>
                          <p><ChemicalText text={selectedQuestionForModal.data.explanation || 'Great job! Your understanding is correct.'} /></p>
                        </div>
                      </div>
                    </>
                  ) : (
                    // WRONG ANSWER VIEW
                    <>
                      {/* Wrong Answer Explanation */}
                      <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-4 border-l-4 border-red-600">
                        <p className="font-semibold text-red-700 dark:text-red-400 mb-2">✗ Not Correct</p>
                        <p className="text-slate-700 dark:text-gray-300">
                          <ChemicalText text={selectedQuestionForModal.data.explanation || 'Your answer needs review.'} />
                        </p>
                      </div>
                      
                      {/* Correct Answer */}
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border-l-4 border-green-600">
                        <p className="font-semibold text-green-700 dark:text-green-400 mb-2">✓ Correct Answer:</p>
                        <p className="text-slate-800 dark:text-gray-300 mb-2">
                          <span className="font-mono font-bold">{selectedQuestionForModal.data.correctAnswer || '?'}</span>{' '}
                          {selectedQuestionForModal.data.correctAnswerText || '(Answer text not available)'}
                        </p>
                        <div className="text-slate-700 dark:text-gray-300 mt-2 pt-2 border-t border-green-200 dark:border-green-700">
                          <p className="font-medium">Detailed Explanation:</p>
                          <p><ChemicalText text={selectedQuestionForModal.data.correctExplanation || selectedQuestionForModal.data.explanation} /></p>
                        </div>
                      </div>
                      
                      {/* Learning Tip */}
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border-l-4 border-amber-500">
                        <p className="font-semibold text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-2">
                          <Lightbulb size={16} /> Learning Tip:
                        </p>
                        <p className="text-slate-700 dark:text-gray-300">
                          Review why the correct answer is right and understand where your answer differs. 
                          Focus on understanding the underlying concept rather than just memorizing the answer.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Modal Footer - Fixed */}
              <div className="p-6 border-t dark:border-gray-700 bg-slate-50 dark:bg-gray-900 flex-shrink-0">
                <button
                  onClick={() => setSelectedQuestionForModal(null)}
                  className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Loading
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-indigo-600 dark:text-indigo-400" />
    </div>
  );
};

export default QuizPage;