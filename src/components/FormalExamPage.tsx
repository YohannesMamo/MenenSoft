// src/components/FormalExamPage.tsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { RichText } from '../lib/content';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const FormalExamPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId, sectionInfo } = location.state || {};
  
  const [allQuestions, setAllQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(3600);
  const [startTime] = useState(Date.now());

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!sessionId) {
      navigate('/dashboard');
      return;
    }
    loadAllQuestions();
  }, [sessionId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          submitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadAllQuestions = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/exams/questions/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setAllQuestions(data.questions || []);
    } catch (err) {
      console.error('Error loading questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: string, optionLabel: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionLabel }));
  };

  const submitExam = async () => {
    setSubmitting(true);
    try {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);

      const answersList = Object.entries(answers).map(([questionId, selectedOption]) => ({
        questionId,
        selectedOption,
        responseTimeSeconds: 0
      }));

      const response = await fetch(`${API_BASE}/api/exams/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId,
          answers: answersList,
          timeSpentSeconds: timeSpent
        })
      });

      if (!response.ok) throw new Error();

      await response.json();

      // Navigate to separate Review Page
      navigate('/exam-review', { 
        state: { 
          questions: allQuestions, 
          answers: answers,
          sectionInfo 
        } 
      });

    } catch (err) {
      console.error('Error submitting exam:', err);
      alert('Failed to submit exam. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = allQuestions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = allQuestions.length > 0 ? (answeredCount / allQuestions.length) * 100 : 0;

  if (loading) return <div className="flex justify-center items-center h-64 text-gray-500 dark:text-gray-400">Loading exam...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md dark:shadow-gray-800/50 p-4 mb-6 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-bold text-gray-800 dark:text-gray-300">Formal Exam Mode</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">{sectionInfo?.textbookName} • Chapter {sectionInfo?.chapterId}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">{answeredCount} of {allQuestions.length} answered</div>
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-mono font-bold">
              <Clock className="h-5 w-5" />
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
        <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
          <div className="h-2 bg-indigo-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {currentQuestion && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-800/50 p-8 dark:text-gray-300">
          <div className="flex justify-between mb-6">
            <span className="font-medium">Question {currentIndex + 1} of {allQuestions.length}</span>
            <span>{currentQuestion.qPoints} points</span>
          </div>

          <p className="text-xl mb-8"><RichText text={currentQuestion.qText} /></p>

          <div className="space-y-3 mb-8">
            {currentQuestion.options.map((opt: any) => (
              <button
                key={opt.optionLabel}
                onClick={() => handleAnswerSelect(currentQuestion.questionID, opt.optionLabel)}
                className={`w-full text-left p-4 rounded-xl border-2 ${
                  answers[currentQuestion.questionID] === opt.optionLabel 
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                }`}
              >
                <span className="font-bold mr-3">{opt.optionLabel}.</span>
                <RichText text={opt.optionText} />
              </button>
            ))}
          </div>

          <div className="flex justify-between">
            <button 
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} 
              disabled={currentIndex === 0}
              className="disabled:opacity-50 dark:text-gray-300"
            >
              Previous
            </button>
            
            {currentIndex === allQuestions.length - 1 ? (
              <button 
                onClick={submitExam} 
                disabled={submitting}
                className="bg-green-600 text-white px-6 py-2 rounded-lg disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Exam"}
              </button>
            ) : (
              <button 
                onClick={() => setCurrentIndex(i => i + 1)}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormalExamPage;
