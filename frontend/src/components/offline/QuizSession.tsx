/**
 * QuizSession - Reusable quiz component for offline mode.
 * Displays questions one at a time, tracks answers, shows results.
 */
import { useState, useCallback } from 'react';
import { ChemicalText } from '../../lib/chemical';

interface QuizOption {
  optionId: string;
  text: string;
  explanation?: string;
  isCorrect?: boolean;
  label?: string;
}

interface QuizQuestion {
  id: string;
  text: string;
  points: number;
  difficulty?: string;
  options: QuizOption[];
}

interface QuizResult {
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  totalScore: number;
  percentage: number;
  timeSpent: string;
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
  }[];
}

interface QuizSessionProps {
  questions: QuizQuestion[];
  onComplete: (result: QuizResult) => void;
}

export default function QuizSession({ questions, onComplete }: QuizSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [startTime] = useState(Date.now());
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const question = questions[currentIndex];
  const totalQuestions = questions.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const handleSelectOption = useCallback((optionId: string) => {
    if (showFeedback) return;
    setSelectedOption(optionId);
    setAnswers(prev => ({ ...prev, [question.id]: optionId }));
    setShowFeedback(true);
  }, [question, showFeedback]);

  const handleNext = useCallback(() => {
    if (isLastQuestion) {
      // Calculate results
      const elapsed = Date.now() - startTime;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      const timeSpent = `${minutes}m ${seconds}s`;

      let correctCount = 0;
      let totalScore = 0;
      const results = questions.map(q => {
        const selectedId = answers[q.id];
        const selectedOpt = q.options.find(o => o.optionId === selectedId);
        const correctOpt = q.options.find(o => o.isCorrect);
        const isCorrect = selectedId === correctOpt?.optionId;
        if (isCorrect) correctCount++;
        const pointsEarned = isCorrect ? q.points : 0;
        totalScore += pointsEarned;

        return {
          questionId: q.id,
          questionText: q.text,
          yourAnswer: selectedOpt?.label || selectedId || 'Not answered',
          yourAnswerText: selectedOpt?.text || '',
          isCorrect,
          pointsEarned,
          maxPoints: q.points,
          correctAnswer: correctOpt?.label || '',
          correctAnswerText: correctOpt?.text || '',
          explanation: selectedOpt?.explanation || correctOpt?.explanation || '',
        };
      });

      const maxPossible = questions.reduce((sum, q) => sum + q.points, 0);
      onComplete({
        totalQuestions,
        correctCount,
        incorrectCount: totalQuestions - correctCount,
        totalScore,
        percentage: maxPossible > 0 ? (totalScore / maxPossible) * 100 : 0,
        timeSpent,
        results,
      });
    } else {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowFeedback(false);
    }
  }, [currentIndex, isLastQuestion, questions, answers, startTime, onComplete]);

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>Question {currentIndex + 1} of {totalQuestions}</span>
          <span>{answeredCount} answered</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
            {question.points} pt{question.points !== 1 ? 's' : ''}
          </span>
          {question.difficulty && (
            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
              {question.difficulty}
            </span>
          )}
        </div>

        <div className="text-gray-800 dark:text-white mb-6 text-lg leading-relaxed">
          <ChemicalText text={question.text} />
        </div>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((opt, idx) => {
            const isSelected = selectedOption === opt.optionId;
            const isCorrect = opt.isCorrect;
            const label = opt.label || String.fromCharCode(65 + idx); // A, B, C, D...

            let borderColor = 'border-gray-200 dark:border-gray-600';
            let bgColor = 'bg-white dark:bg-gray-700';

            if (showFeedback) {
              if (isCorrect) {
                borderColor = 'border-green-500';
                bgColor = 'bg-green-50 dark:bg-green-900/20';
              } else if (isSelected && !isCorrect) {
                borderColor = 'border-red-500';
                bgColor = 'bg-red-50 dark:bg-red-900/20';
              }
            } else if (isSelected) {
              borderColor = 'border-indigo-500';
              bgColor = 'bg-indigo-50 dark:bg-indigo-900/20';
            }

            return (
              <button
                key={opt.optionId}
                onClick={() => handleSelectOption(opt.optionId)}
                disabled={showFeedback}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${borderColor} ${bgColor} ${
                  !showFeedback ? 'hover:border-indigo-300 cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-600 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300 flex-shrink-0">
                    {label}
                  </span>
                  <span className="text-gray-700 dark:text-gray-200 flex-1">
                    <ChemicalText text={opt.text} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {showFeedback && (
          <div className={`mt-4 p-4 rounded-lg ${
            question.options.find(o => o.optionId === selectedOption)?.isCorrect
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200'
          }`}>
            {question.options.find(o => o.optionId === selectedOption)?.isCorrect ? (
              <p className="text-green-700 dark:text-green-300 font-medium">✓ Correct!</p>
            ) : (
              <>
                <p className="text-red-700 dark:text-red-300 font-medium">✗ Incorrect</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Correct answer: <strong>{question.options.find(o => o.isCorrect)?.text}</strong>
                </p>
              </>
            )}
            {question.options.find(o => o.optionId === selectedOption)?.explanation && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                <ChemicalText text={question.options.find(o => o.optionId === selectedOption)!.explanation!} />
              </p>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => {
            setCurrentIndex(prev => prev - 1);
            setSelectedOption(answers[questions[currentIndex - 1]?.id] || null);
            setShowFeedback(!!answers[questions[currentIndex - 1]?.id]);
          }}
          disabled={currentIndex === 0}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50"
        >
          ← Previous
        </button>
        <button
          onClick={handleNext}
          className={`px-6 py-2 rounded-lg text-sm font-medium text-white ${
            isLastQuestion
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isLastQuestion ? 'See Results' : 'Next →'}
        </button>
      </div>
    </div>
  );
}
