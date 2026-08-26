/**
 * Offline Exam Page
 * Exam section chooser, mode selector, and exam/practice session using local SQLite.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOfflineMode } from '../../context/OfflineContext';
import {
  getExamSections, getExamQuestions,
  recordExamSession,
} from '../../services/offlineDb';
import { ChemicalText } from '../../lib/chemical';

// ============================================================================
// Exam Session Component (reusable for practice + exam modes)
// ============================================================================

interface ExamOption {
  optionLabel: string;
  optionText: string;
  explanation?: string;
  isCorrect: boolean;
}

interface ExamQuestion {
  questionId: string;
  text: string;
  points: number;
  options: ExamOption[];
}

interface ExamSessionProps {
  questions: ExamQuestion[];
  mode: 'practice' | 'exam';
  sectionInfo: { stbId: string; chapterId: number; sectionId: string; questionCount: number };
  onComplete: (result: any) => void;
}

function ExamSession({ questions, mode, sectionInfo: _sectionInfo, onComplete }: ExamSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [startTime] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(mode === 'exam' ? 1800 : 0); // 30 min for exam mode

  const question = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  // Timer for exam mode
  useEffect(() => {
    if (mode !== 'exam' || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-finish
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, timeLeft > 0]);

  const handleFinish = useCallback(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    let correctCount = 0;
    let totalScore = 0;

    const results = questions.map(q => {
      const selectedId = answers[q.questionId];
      const correctOpt = q.options.find(o => o.isCorrect);
      const isCorrect = selectedId === correctOpt?.optionLabel;
      if (isCorrect) correctCount++;
      const pointsEarned = isCorrect ? q.points : 0;
      totalScore += pointsEarned;

      return {
        questionId: q.questionId,
        questionText: q.text,
        yourAnswer: selectedId || 'Not answered',
        yourAnswerText: q.options.find(o => o.optionLabel === selectedId)?.optionText || '',
        isCorrect,
        pointsEarned,
        maxPoints: q.points,
        correctAnswer: correctOpt?.optionLabel || '',
        correctAnswerText: correctOpt?.optionText || '',
        explanation: q.options.find(o => o.optionLabel === selectedId)?.explanation || correctOpt?.explanation || '',
      };
    });

    const maxPossible = questions.reduce((sum, q) => sum + q.points, 0);
    onComplete({
      totalQuestions: questions.length,
      correctCount,
      incorrectCount: questions.length - correctCount,
      totalScore,
      percentage: maxPossible > 0 ? (totalScore / maxPossible) * 100 : 0,
      timeSpentSeconds: elapsed,
      timeSpent: `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`,
      mode,
      results,
    });
  }, [questions, answers, startTime, mode, onComplete]);

  const handleSelectOption = (optionLabel: string) => {
    if (showFeedback && mode === 'practice') return;
    setSelectedOption(optionLabel);
    setAnswers(prev => ({ ...prev, [question.questionId]: optionLabel }));

    if (mode === 'practice') {
      setShowFeedback(true);
    }
  };

  const handleNext = () => {
    if (isLastQuestion) {
      handleFinish();
    } else {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowFeedback(false);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4 bg-white dark:bg-gray-800 rounded-xl shadow p-3">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          Q {currentIndex + 1}/{questions.length} · {answeredCount} answered
        </div>
        {mode === 'exam' && (
          <div className={`text-sm font-mono font-bold ${timeLeft < 300 ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>
            ⏱ {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
        <div
          className="bg-indigo-600 h-2 rounded-full transition-all"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-4">
        <div className="text-gray-800 dark:text-white mb-6 text-lg leading-relaxed">
          <ChemicalText text={question.text} />
        </div>

        <div className="space-y-3">
          {question.options.map((opt) => {
            const isSelected = selectedOption === opt.optionLabel;
            let borderColor = 'border-gray-200 dark:border-gray-600';
            let bgColor = 'bg-white dark:bg-gray-700';

            if (showFeedback || (mode === 'exam' && answers[question.questionId])) {
              if (opt.isCorrect) {
                borderColor = 'border-green-500';
                bgColor = 'bg-green-50 dark:bg-green-900/20';
              } else if (isSelected && !opt.isCorrect) {
                borderColor = 'border-red-500';
                bgColor = 'bg-red-50 dark:bg-red-900/20';
              }
            } else if (isSelected) {
              borderColor = 'border-indigo-500';
              bgColor = 'bg-indigo-50 dark:bg-indigo-900/20';
            }

            return (
              <button
                key={opt.optionLabel}
                onClick={() => handleSelectOption(opt.optionLabel)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${borderColor} ${bgColor} ${
                  !showFeedback ? 'hover:border-indigo-300 cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-600 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300 flex-shrink-0">
                    {opt.optionLabel}
                  </span>
                  <span className="text-gray-700 dark:text-gray-200 flex-1">
                    <ChemicalText text={opt.optionText} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Practice mode feedback */}
        {showFeedback && mode === 'practice' && (
          <div className={`mt-4 p-4 rounded-lg ${
            question.options.find(o => o.optionLabel === selectedOption)?.isCorrect
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200'
          }`}>
            {question.options.find(o => o.optionLabel === selectedOption)?.isCorrect ? (
              <p className="text-green-700 dark:text-green-300 font-medium">✓ Correct!</p>
            ) : (
              <>
                <p className="text-red-700 dark:text-red-300 font-medium">✗ Incorrect</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Correct answer: <strong>{question.options.find(o => o.isCorrect)?.optionText}</strong>
                </p>
              </>
            )}
            {question.options.find(o => o.optionLabel === selectedOption)?.explanation && (
              <p className="text-sm text-gray-500 mt-2 italic">
                <ChemicalText text={question.options.find(o => o.optionLabel === selectedOption)!.explanation!} />
              </p>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => {
            if (currentIndex > 0) {
              setCurrentIndex(prev => prev - 1);
              const prevQ = questions[currentIndex - 1];
              setSelectedOption(answers[prevQ.questionId] || null);
              setShowFeedback(false);
            }
          }}
          disabled={currentIndex === 0}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50"
        >
          ← Previous
        </button>
        {mode === 'exam' ? (
          <button
            onClick={handleFinish}
            className="px-6 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700"
          >
            Finish Exam & See Results
          </button>
        ) : (
          <button
            onClick={handleNext}
            className={`px-6 py-2 rounded-lg text-sm font-medium text-white ${
              isLastQuestion ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isLastQuestion ? 'See Results' : 'Next →'}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Offline Exam Page
// ============================================================================

export default function OfflineExamPage() {
  const navigate = useNavigate();
  const { textbooks } = useOfflineMode();

  const [selectedTextbook, setSelectedTextbook] = useState<string | null>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [mode, setMode] = useState<'practice' | 'exam' | null>(null);
  const [examStarted, setExamStarted] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [examResult, setExamResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Load sections when textbook selected
  useEffect(() => {
    if (!selectedTextbook) return;
    setLoading(true);
    getExamSections(selectedTextbook).then(data => {
      setSections(data);
      setLoading(false);
    });
  }, [selectedTextbook]);

  // Load questions when exam starts
  useEffect(() => {
    if (!examStarted || !selectedSection || !selectedTextbook || !mode) return;
    setLoading(true);
    getExamQuestions(selectedTextbook, selectedSection.chapter_id, selectedSection.section_id).then(data => {
      const mapped = data.map((q: any) => ({
        questionId: q.question_id,
        text: q.question_text,
        points: q.points,
        options: (q.options || []).map((o: any) => ({
          optionLabel: o.option_label,
          optionText: o.option_text,
          explanation: o.explanation,
          isCorrect: !!o.is_correct,
        })),
      }));
      // Shuffle for exam mode
      if (mode === 'exam') {
        for (let i = mapped.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
        }
      }
      setQuestions(mapped);
      setLoading(false);
    });
  }, [examStarted, selectedSection, selectedTextbook, mode]);

  const handleExamComplete = useCallback(async (result: any) => {
    setExamResult(result);
    setExamStarted(false);

    if (selectedTextbook && selectedSection) {
      await recordExamSession({
        stb_id: selectedTextbook,
        chapter_id: selectedSection.chapter_id,
        section_id: selectedSection.section_id,
        session_type: mode || 'practice',
        total_questions: result.totalQuestions,
        time_spent_seconds: result.timeSpentSeconds,
        answers: result.results.map((r: any) => ({
          question_id: r.questionId,
          answer_text: r.yourAnswer,
          points: r.pointsEarned,
          is_correct: r.isCorrect,
        })),
      });
    }
  }, [selectedTextbook, selectedSection, mode]);

  // Result view
  if (examResult) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            {examResult.mode === 'exam' ? 'Exam' : 'Practice'} Complete!
          </h2>
          <div className={`text-5xl font-bold mb-2 ${
            examResult.percentage >= 70 ? 'text-green-600' : examResult.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {examResult.percentage.toFixed(0)}%
          </div>
          <div className="text-gray-500 mb-2">
            {examResult.correctCount} correct · {examResult.incorrectCount} wrong
          </div>
          <div className="text-sm text-gray-400">Time: {examResult.timeSpent}</div>
        </div>

        <div className="space-y-3">
          {examResult.results.map((r: any) => (
            <div
              key={r.questionId}
              className={`p-4 rounded-xl border-2 ${
                r.isCorrect ? 'border-green-200 bg-green-50 dark:bg-green-900/10'
                            : 'border-red-200 bg-red-50 dark:bg-red-900/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm ${
                  r.isCorrect ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {r.isCorrect ? '✓' : '✗'}
                </span>
                <div className="flex-1">
                  <div className="text-sm text-gray-800 dark:text-gray-200">
                    <ChemicalText text={r.questionText} />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Your answer: <span className={r.isCorrect ? 'text-green-600' : 'text-red-600'}>{r.yourAnswerText}</span>
                  </div>
                  {!r.isCorrect && (
                    <div className="text-xs text-green-600 mt-1">Correct: {r.correctAnswerText}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={() => { setExamResult(null); setExamStarted(false); setMode(null); setSelectedSection(null); }}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Try Again
          </button>
          <button onClick={() => navigate(-1)} className="px-6 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // Active exam
  if (examStarted && questions.length > 0) {
    return (
      <ExamSession
        questions={questions}
        mode={mode!}
        sectionInfo={{
          stbId: selectedTextbook!,
          chapterId: selectedSection.chapter_id,
          sectionId: selectedSection.section_id,
          questionCount: questions.length,
        }}
        onComplete={handleExamComplete}
      />
    );
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  // Mode selector
  if (selectedSection && !mode) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <button onClick={() => setSelectedSection(null)} className="text-blue-600 hover:underline text-sm mb-4">
          ← Back to sections
        </button>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
          Choose Mode: {selectedSection.section_id}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setMode('practice')}
            className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition text-left"
          >
            <div className="text-2xl mb-2">📝</div>
            <h3 className="font-bold text-gray-800 dark:text-white">Practice Mode</h3>
            <p className="text-sm text-gray-500 mt-1">See feedback after each answer. Learn as you go.</p>
          </button>
          <button
            onClick={() => setMode('exam')}
            className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition text-left"
          >
            <div className="text-2xl mb-2">⏱️</div>
            <h3 className="font-bold text-gray-800 dark:text-white">Exam Mode</h3>
            <p className="text-sm text-gray-500 mt-1">30-minute timer. No feedback until the end.</p>
          </button>
        </div>
      </div>
    );
  }

  // Textbook selection
  if (!selectedTextbook) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
          📝 Exams (Offline)
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {textbooks.map((tb: any) => (
            <button
              key={tb.stb_id}
              onClick={() => setSelectedTextbook(tb.stb_id)}
              className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-md transition text-left"
            >
              <div className="font-semibold text-gray-800 dark:text-white">{tb.title}</div>
              <div className="text-sm text-gray-500 mt-1">
                {sections.length} sections available
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Section selection
  const tbTitle = textbooks.find((t: any) => t.stb_id === selectedTextbook)?.title || '';
  return (
    <div className="max-w-4xl mx-auto p-4">
      <button onClick={() => setSelectedTextbook(null)} className="text-blue-600 hover:underline text-sm mb-4">
        ← Back to textbooks
      </button>
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{tbTitle}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sections.map((sec) => (
          <button
            key={`${sec.chapter_id}-${sec.section_id}`}
            onClick={() => setSelectedSection(sec)}
            className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-md transition text-left"
          >
            <div className="text-sm text-gray-400">Chapter {sec.chapter_id}</div>
            <div className="font-semibold text-gray-800 dark:text-white">{sec.section_id}</div>
            <div className="text-sm text-indigo-600 mt-1">{sec.question_count} questions</div>
          </button>
        ))}
        {sections.length === 0 && (
          <p className="text-gray-500 col-span-2 text-center py-8">No exam sections available.</p>
        )}
      </div>
    </div>
  );
}
