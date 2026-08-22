import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RichText } from '../lib/content';
import { ChemicalText } from '../lib/chemical';

interface Option {
  optionLabel: string;
  optionText: string;
  opExplanation?: string;
}

interface Question {
  questionID: string;
  qText: string;
  qPoints: number;
  options: Option[];
}

interface ExamSessionProps {
  sessionId: string;
  mode: 'practice' | 'exam';
  onExamComplete: (result: any) => void;
}

const ExamSession: React.FC<ExamSessionProps> = ({ sessionId, mode, onExamComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [feedback, setFeedback] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(mode === 'exam' ? 1800 : 0);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (mode === 'exam' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, mode]);

  const loadNextQuestion = async () => {
    setIsLoading(true);
    setSelectedOption('');
    setFeedback(null);

    try {
      const res = await axios.get(`/api/exams/next/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.data.questionID) {
        finishExam();
        return;
      }

      setCurrentQuestion(res.data);
      setAnsweredCount(prev => prev + 1);
    } catch (err) {
      console.error(err);
      finishExam();
    }
    setIsLoading(false);
  };

  const submitAnswer = async () => {
    if (!selectedOption || !currentQuestion) return;

    setIsLoading(true);
    try {
      const res = await axios.post(
        '/api/exams/answer',
        {
          sessionId,
          questionId: currentQuestion.questionID,
          selectedOption,
          responseTimeSeconds: 45
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setFeedback(res.data);

    } catch (err) {
      alert("Failed to submit answer");
    }
    setIsLoading(false);
  };

  const finishExam = async () => {
    try {
      const res = await axios.post(
        '/api/exams/finish',
        { sessionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onExamComplete(res.data);
    } catch (err) {
      alert("Failed to finish exam");
    }
  };

  // Load first question
  useEffect(() => {
    loadNextQuestion();
  }, []);

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow dark:shadow-gray-800/50">
        <div>
          <h2 className="text-2xl font-bold dark:text-white">Biology Exam • Section 1.3</h2>
          <p className="text-gray-500 dark:text-gray-400">Question {answeredCount || 1} • {mode === 'practice' ? 'Practice Mode' : 'Exam Mode'}</p>
        </div>
        {mode === 'exam' && <div className="text-xl font-mono font-bold text-red-600 dark:text-red-400">⏱ {formatTime(timeLeft)}</div>}
      </div>

      {/* Question Text */}
      {currentQuestion && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow dark:shadow-gray-800/50 p-10 mb-8 border-l-8 border-indigo-600">
          <p className="text-xl leading-relaxed text-gray-800 dark:text-gray-300"><RichText text={currentQuestion.qText} /></p>
        </div>
      )}

      {/* Options */}
      {currentQuestion && !feedback && (
        <div className="space-y-4 mb-8">
          {currentQuestion.options.map((opt) => (
            <button
              key={opt.optionLabel}
              onClick={() => setSelectedOption(opt.optionLabel)}
              className={`w-full text-left p-6 rounded-2xl border-2 transition-all ${
                selectedOption === opt.optionLabel ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 shadow' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="font-bold text-lg mr-4 text-indigo-600 dark:text-indigo-400">{opt.optionLabel}.</span>
              <span className="text-gray-700 dark:text-gray-300"><RichText text={opt.optionText} /></span>
            </button>
          ))}
        </div>
      )}

      {/* Submit Button */}
      {currentQuestion && !feedback && (
        <button
          onClick={submitAnswer}
          disabled={!selectedOption || isLoading}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 text-white font-semibold rounded-2xl text-lg"
        >
          Submit Answer
        </button>
      )}

      {/* Practice Mode Feedback - Your Desired Format */}
      {feedback && mode === 'practice' && currentQuestion && (
        <div className={`mt-8 p-8 rounded-3xl border ${feedback.correct ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'}`}>
          
          <p className="text-xl font-medium mb-6 dark:text-gray-300"><RichText text={currentQuestion.qText} /></p>

          {/* Student's Answer */}
          <div className="mb-6">
            <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Your Answer:</p>
            <p className="text-lg dark:text-gray-300">
              {selectedOption}. <RichText text={currentQuestion.options.find(o => o.optionLabel === selectedOption)?.optionText || ''} />
            </p>
          </div>

          {/* Correct Answer Section */}
          <div>
            <p className={`font-medium mb-1 ${feedback.correct ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              {feedback.correct ? 'Correct!' : 'Incorrect'}
            </p>
            <p className="text-lg font-semibold dark:text-gray-300">
              Correct Answer: {feedback.correctAnswer}.{' '}
              <RichText text={currentQuestion.options.find(o => o.optionLabel === feedback.correctAnswer)?.optionText || ''} />
            </p>
            <p className="mt-4 text-gray-700 dark:text-gray-300 leading-relaxed"><ChemicalText text={feedback.explanation} /></p>
          </div>

          <button
            onClick={loadNextQuestion}
            className="mt-10 w-full py-4 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700"
          >
            Next Question →
          </button>
        </div>
      )}

      {/* Exam Mode Finish Button */}
      {mode === 'exam' && (
        <button
          onClick={finishExam}
          className="mt-8 w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold"
        >
          Finish Exam & See Results
        </button>
      )}
    </div>
  );
};

export default ExamSession;