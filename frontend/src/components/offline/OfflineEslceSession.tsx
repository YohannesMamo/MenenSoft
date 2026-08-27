/**
 * Offline ESLCE Session
 * Handles both practice and exam mode for ESLCE questions.
 * All questions loaded from location.state, no server calls.
 */
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChemicalText } from '../../lib/chemical';

interface Option {
  id: number;
  label: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: number;
  code: string;
  text: string;
  marks: number;
  question_number: number;
  options: Option[];
  passage?: any;
  images?: any[];
}

export default function OfflineEslceSession() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as any;

  const questions: Question[] = state?.questions || [];
  const exam = state?.exam || {};
  const mode: 'practice' | 'exam' = state?.mode || 'exam';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({}); // questionId -> optionId
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [startTime] = useState(Date.now());
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [result, setResult] = useState<any>(null);

  const question = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  if (questions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-4 text-center py-12">
        <p className="text-gray-500 mb-4">No questions available for this exam.</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg">
          ← Back to Library
        </button>
      </div>
    );
  }

  const handleSelectOption = (optionId: number) => {
    if (showFeedback && mode === 'practice') return;
    setSelectedOption(optionId);
    setAnswers(prev => ({ ...prev, [question.id]: optionId }));
    if (mode === 'practice') {
      setShowFeedback(true);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(answers[questions[currentIndex + 1]?.id] || null);
      setShowFeedback(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setSelectedOption(answers[questions[currentIndex - 1]?.id] || null);
      setShowFeedback(false);
    }
  };

  const toggleFlag = () => {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(question.id)) next.delete(question.id);
      else next.add(question.id);
      return next;
    });
  };

  const handleSubmit = () => {
    const timeSpent = Date.now() - startTime;
    let correctCount = 0;
    let wrongCount = 0;

    const gradedQuestions = questions.map(q => {
      const selectedOptionId = answers[q.id];
      const correctOpt = q.options.find(o => o.isCorrect);
      const isCorrect = selectedOptionId !== undefined && selectedOptionId !== null
        && correctOpt?.id === selectedOptionId;
      if (isCorrect) correctCount++;
      else if (selectedOptionId !== undefined) wrongCount++;

      return {
        question_id: q.id,
        question_text: q.text,
        selected_option_id: selectedOptionId || null,
        is_correct: isCorrect,
        question_number: q.question_number,
        correct_option_id: correctOpt?.id || null,
      };
    });

    const totalQuestions = questions.length;
    const percentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

    setResult({
      session_id: 0,
      subject_name: exam.subject_name,
      title: exam.title || `${exam.year} ${exam.semester}`,
      exam_type: exam.exam_type || 'past',
      mode,
      total_questions: totalQuestions,
      correct_count: correctCount,
      wrong_count: wrongCount,
      unanswered_count: totalQuestions - answeredCount,
      percentage,
      time_spent_ms: timeSpent,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      responses: gradedQuestions,
    });
    setShowSubmitConfirm(false);
  };

  if (result) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            {result.mode === 'exam' ? 'Exam' : 'Practice'} Complete!
          </h2>
          <div className={`text-5xl font-bold mb-2 ${
            result.percentage >= 70 ? 'text-green-600' : result.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {result.percentage.toFixed(0)}%
          </div>
          <div className="text-gray-500 mb-2">
            {result.correct_count} answered · {result.unanswered_count} unanswered
          </div>
          <div className="text-sm text-gray-400">
            {result.subject_name} — {result.title}
          </div>
        </div>

        {/* Question review */}
        <div className="space-y-3">
          {questions.map((q) => {
            const selectedOptionId = answers[q.id];
            const selectedOpt = q.options.find(o => o.id === selectedOptionId);
            const correctOpt = q.options.find(o => o.isCorrect);
            const isCorrect = selectedOptionId !== undefined && correctOpt?.id === selectedOptionId;
            return (
              <div key={q.id} className={`rounded-xl shadow p-4 ${
                selectedOptionId === undefined ? 'bg-gray-50 dark:bg-gray-800 border border-gray-200' :
                isCorrect ? 'bg-green-50 dark:bg-green-900/10 border border-green-200' :
                'bg-red-50 dark:bg-red-900/10 border border-red-200'
              }`}>
                <div className="text-sm font-medium text-gray-400 mb-1">Q{q.question_number}</div>
                <div className="text-sm text-gray-800 dark:text-gray-200 mb-2">
                  <ChemicalText text={q.text} />
                </div>
                <div className="text-xs">
                  {selectedOpt ? (
                    <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                      Your answer: {selectedOpt.label}. {selectedOpt.text}
                    </span>
                  ) : (
                    <span className="text-gray-400">Not answered</span>
                  )}
                </div>
                {!isCorrect && correctOpt && (
                  <div className="text-xs text-green-600 mt-1">Correct: {correctOpt.label}. {correctOpt.text}</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 bg-white dark:bg-gray-800 rounded-xl shadow p-3">
        <button onClick={() => setShowNavigator(!showNavigator)} className="text-sm text-indigo-600">
          Questions ({answeredCount}/{questions.length})
        </button>
        <div className="flex items-center gap-2">
          <button onClick={toggleFlag} className={`text-sm px-2 py-1 rounded ${flagged.has(question.id) ? 'bg-yellow-100 text-yellow-700' : 'text-gray-400'}`}>
            🚩
          </button>
        </div>
      </div>

      {/* Question navigator */}
      {showNavigator && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-4">
          <div className="grid grid-cols-10 gap-1.5">
            {questions.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined;
              const isFlagged = flagged.has(q.id);
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setSelectedOption(answers[q.id] || null);
                    setShowFeedback(false);
                    setShowNavigator(false);
                  }}
                  className={`w-8 h-8 rounded text-xs font-medium ${
                    isCurrent ? 'bg-indigo-600 text-white' :
                    isAnswered ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
                    isFlagged ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {q.question_number}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Passage if any */}
      {question.passage && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 rounded-xl p-4 mb-4">
          <h4 className="font-medium text-amber-800 dark:text-amber-200 text-sm mb-2">Reading Passage</h4>
          <div className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed">
            <ChemicalText text={question.passage.passage_content || question.passage.content || ''} />
          </div>
        </div>
      )}

      {/* Question */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-4">
        <div className="text-sm font-medium text-gray-400 mb-2">
          Question {question.question_number} · {question.marks} mark{question.marks !== 1 ? 's' : ''}
        </div>
        <div className="text-gray-800 dark:text-white mb-6 text-lg leading-relaxed">
          <ChemicalText text={question.text} />
        </div>

        <div className="space-y-3">
          {question.options.map(opt => {
            const isSelected = selectedOption === opt.id;
            let borderColor = 'border-gray-200 dark:border-gray-600';
            let bgColor = 'bg-white dark:bg-gray-700';

            if (showFeedback) {
              // In practice mode, highlight selected
              if (isSelected) {
                borderColor = 'border-indigo-500';
                bgColor = 'bg-indigo-50 dark:bg-indigo-900/20';
              }
            } else if (isSelected) {
              borderColor = 'border-indigo-500';
              bgColor = 'bg-indigo-50 dark:bg-indigo-900/20';
            }

            return (
              <button
                key={opt.id}
                onClick={() => handleSelectOption(opt.id)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${borderColor} ${bgColor} ${
                  !showFeedback ? 'hover:border-indigo-300 cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-600 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300 flex-shrink-0">
                    {opt.label}
                  </span>
                  <span className="text-gray-700 dark:text-gray-200 flex-1">
                    <ChemicalText text={opt.text} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="px-4 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 disabled:opacity-50"
        >
          ← Prev
        </button>
        {currentIndex < questions.length - 1 ? (
          <button
            onClick={handleNext}
            className="px-6 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={() => setShowSubmitConfirm(true)}
            className="px-6 py-2 rounded-lg text-sm bg-green-600 text-white hover:bg-green-700"
          >
            Submit
          </button>
        )}
      </div>

      {/* Submit confirmation modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Submit Exam?</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-6 space-y-1">
              <p>Answered: {answeredCount}/{questions.length}</p>
              <p>Flagged: {flagged.size}</p>
              <p>Unanswered: {questions.length - answeredCount}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
              >
                Continue
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
