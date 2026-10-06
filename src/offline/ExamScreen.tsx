/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { sqliteDb } from './db';
import { EvaluationService, EVALUATION_THRESHOLDS } from './evaluation';
import { RichText } from '../lib/content';
import type {
  ExamQuestion,
  ExamQuestionOption,
  ExamSession,
  ExamAnswer,
  TextbookChapter,
  QuestionHistoryItem,
  SectionBreakdownItem
} from './types';
import confetti from './confetti';
import {
  FileText,
  Clock,
  Flag,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Award,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Timer,
  AlertCircle
} from 'lucide-react';

export const ExamScreen: React.FC = () => {
  const metadata = sqliteDb.getAppMetadata();
  const textbooks = sqliteDb.getTextbooks();

  const [selectedBookId, setSelectedBookId] = useState<string>(textbooks[0]?.stb_id || '');
  const [chapters, setChapters] = useState<TextbookChapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<number>(1);
  const [selectedMode, setSelectedMode] = useState<'practice' | 'formal'>('formal');

  // Exam execution state
  const [examState, setExamState] = useState<'pick' | 'taking' | 'review'>('pick');
  const [questions, setQuestions] = useState<{ question: ExamQuestion; options: ExamQuestionOption[] }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // User state per question
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({}); // index -> optionRecordId
  const [flaggedIndices, setFlaggedIndices] = useState<Record<number, boolean>>({}); // index -> boolean
  const [answerChangesCount, setAnswerChangesCount] = useState<number>(0);

  // Timer state
  const ALLOTTED_FORMAL_SECONDS = 20 * 60; // 20 minutes formal exam
  const [secondsRemaining, setSecondsRemaining] = useState<number>(ALLOTTED_FORMAL_SECONDS);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [examStartTime, setExamStartTime] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Submit dialog & evaluation results
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [finalSession, setFinalSession] = useState<ExamSession | null>(null);
  const [sectionBreakdown, setSectionBreakdown] = useState<SectionBreakdownItem[]>([]);
  const [evalComparison, setEvalComparison] = useState<{
    scorePercentage: number;
    passed: boolean;
    previousScore?: number;
    scoreDiff?: number;
    improved?: boolean;
    timeUsedSeconds: number;
    flaggedCount: number;
    skippedCount: number;
    answerChanges: number;
  } | null>(null);

  // Sync chapters
  useEffect(() => {
    if (selectedBookId) {
      const chs = sqliteDb.getChapters(selectedBookId);
      setChapters(chs);
      setSelectedChapterId(chs[0]?.chapter_id || 1);
    }
  }, [selectedBookId]);

  // Timer interval for formal mode
  useEffect(() => {
    if (isTimerRunning && secondsRemaining > 0) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleSubmitExam(true); // auto submit on time out
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, secondsRemaining]);

  const handleStartExam = () => {
    const list = sqliteDb.getExamQuestions(selectedBookId, selectedChapterId);
    setQuestions(list);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setFlaggedIndices({});
    setAnswerChangesCount(0);
    setSecondsRemaining(ALLOTTED_FORMAL_SECONDS);
    setExamStartTime(Date.now());
    setIsTimerRunning(selectedMode === 'formal');
    setEvalComparison(null);
    setExamState('taking');
  };

  const handleOptionSelect = (optionRecordId: string) => {
    const previous = selectedAnswers[currentIndex];
    if (previous && previous !== optionRecordId) {
      setAnswerChangesCount(prev => prev + 1);
    }
    setSelectedAnswers({
      ...selectedAnswers,
      [currentIndex]: optionRecordId
    });
  };

  const handleToggleFlag = () => {
    setFlaggedIndices({
      ...flaggedIndices,
      [currentIndex]: !flaggedIndices[currentIndex]
    });
  };

  const handleSubmitExam = (_isTimeout: boolean = false) => {
    setShowSubmitConfirm(false);
    setIsTimerRunning(false);

    let correctCount = 0;
    const totalQuestions = Math.max(1, questions.length);
    const recordedAnswers: ExamAnswer[] = [];
    const sessionId = 'exm_' + Date.now().toString(36);

    const timeUsed = selectedMode === 'formal'
      ? ALLOTTED_FORMAL_SECONDS - secondsRemaining
      : Math.round((Date.now() - examStartTime) / 1000);

    const flaggedCount = Object.values(flaggedIndices).filter(Boolean).length;
    let skippedCount = 0;

    questions.forEach((qItem, idx) => {
      const chosenOptionId = selectedAnswers[idx];
      if (!chosenOptionId) skippedCount++;

      const chosenOption = qItem.options.find(o => o.record_id === chosenOptionId);
      const isCorrect = chosenOption?.is_correct === 1;

      if (isCorrect) correctCount++;

      recordedAnswers.push({
        answer_id: 'exa_' + Date.now().toString(36) + '_' + idx,
        question_id: qItem.question.question_id,
        answer_text: chosenOption?.option_text || '(Unanswered)',
        points: isCorrect ? qItem.question.points : 0,
        answered_at: new Date().toISOString(),
        session_id: sessionId,
        response_time_seconds: 15,
        is_correct: isCorrect ? 1 : 0,
        attempt_order: idx + 1
      });
    });

    // Score = (correct / total) * 100, capped at 100
    const percentage = EvaluationService.computePercentageScore(correctCount, totalQuestions);

    const session: ExamSession = {
      session_id: sessionId,
      stb_id: selectedBookId,
      chapter_id: selectedChapterId,
      session_type: selectedMode,
      started_at: new Date(examStartTime || Date.now()).toISOString(),
      completed_at: new Date().toISOString(),
      overall_score: percentage,
      ended_at: new Date().toISOString(),
      total_questions: totalQuestions,
      correct_answers: correctCount,
      wrong_answers: totalQuestions - correctCount,
      time_spent_seconds: timeUsed,
      attempt_number: 1
    };

    // Question history batch items
    const textbookObj = textbooks.find(t => t.stb_id === selectedBookId);
    const questionHistoryItems: Omit<QuestionHistoryItem, 'history_id'>[] = questions.map((qItem, idx) => {
      const chosenOptionId = selectedAnswers[idx];
      const chosenOption = qItem.options.find(o => o.record_id === chosenOptionId);
      const correctOption = qItem.options.find(o => o.is_correct === 1);
      const isCorrect = chosenOption?.is_correct === 1;

      return {
        question_id: qItem.question.question_id,
        assessment_type: 'exam',
        question_text: qItem.question.question_text,
        selected_answer: chosenOption?.option_text || '(Skipped)',
        correct_answer: correctOption?.option_text || '',
        was_correct: isCorrect ? 1 : 0,
        time_spent_ms: Math.round((timeUsed / totalQuestions) * 1000),
        answered_at: new Date().toISOString(),
        stb_id: selectedBookId,
        chapter_id: selectedChapterId,
        section_id: qItem.question.section_id || 'SEC_1_1',
        subject_name: textbookObj?.title || 'Curriculum',
        explanation: qItem.question.explanation
      };
    });

    // Build section-by-section breakdown
    const breakdown = EvaluationService.buildExamBreakdown(questions, selectedAnswers);
    setSectionBreakdown(breakdown);

    // Record session and get previous attempt comparison
    const result = sqliteDb.recordExamSession(session, recordedAnswers, questionHistoryItems, breakdown);

    setFinalSession(session);
    setEvalComparison({
      scorePercentage: percentage,
      passed: result.passed,
      previousScore: result.previousScore,
      scoreDiff: result.scoreDiff,
      improved: result.improved,
      timeUsedSeconds: timeUsed,
      flaggedCount,
      skippedCount,
      answerChanges: answerChangesCount
    });

    if (percentage >= EVALUATION_THRESHOLDS.EXAM_PASS_PERCENTAGE) {
      try {
        confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
    }

    setExamState('review');
  };

  // Helper format seconds mm:ss
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- VIEW 1: Pick Chapter & Exam Mode ---
  if (examState === 'pick') {
    return (
      <div className="space-y-4 pb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {metadata.grade_label} Chapter Examination
            </h2>
            <p className="text-xs text-slate-400">
              Formal timed & practice modes with 50% pass threshold and section analytics
            </p>
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-4 shadow-sm">
          {/* Step 1: Select Subject Textbook */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              1. Select Subject
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {textbooks.map(b => (
                <button
                  key={b.stb_id}
                  onClick={() => setSelectedBookId(b.stb_id)}
                  className={`p-3 rounded-xl text-left border text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                    selectedBookId === b.stb_id
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                      : 'bg-slate-900/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="line-clamp-1">{b.title}</span>
                  </div>
                  {selectedBookId === b.stb_id && <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Select Unit / Chapter */}
          {chapters.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                2. Select Unit to Examine
              </label>
              <div className="grid grid-cols-1 gap-2">
                {chapters.map(ch => {
                  const prev = sqliteDb.getPreviousExamAttempt(selectedBookId, ch.chapter_id);
                  return (
                    <button
                      key={ch.chapter_id}
                      onClick={() => setSelectedChapterId(ch.chapter_id)}
                      className={`p-3 rounded-xl text-left border text-xs transition-all flex items-center justify-between cursor-pointer ${
                        selectedChapterId === ch.chapter_id
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm font-semibold'
                          : 'bg-slate-900/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">
                          Unit {ch.chapter_id}
                        </span>
                        <span className="font-medium text-white">{ch.chapter_title}</span>
                        {prev && prev.overall_score !== undefined && (
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                            <span>Previous attempt:</span>
                            <span className={prev.overall_score >= 50 ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                              {prev.overall_score}% ({prev.overall_score >= 50 ? 'Passed' : 'Needs Review'})
                            </span>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Exam Mode (Practice vs Formal Timed) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              3. Choose Examination Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedMode('formal')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedMode === 'formal'
                    ? 'bg-indigo-600/20 border-indigo-500 shadow-sm'
                    : 'bg-slate-900/60 border-slate-700/60 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-1">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>Formal Mode</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Enforces strict 20-minute countdown timer. Auto-submits on expiration.
                </p>
              </button>

              <button
                onClick={() => setSelectedMode('practice')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedMode === 'practice'
                    ? 'bg-indigo-600/20 border-indigo-500 shadow-sm'
                    : 'bg-slate-900/60 border-slate-700/60 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-1">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span>Practice Mode</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Untimed practice. Focus on understanding question concepts and navigation.
                </p>
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleStartExam}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Begin Chapter Examination</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle empty question set gracefully
  if (examState === 'taking' && questions.length === 0) {
    return (
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">No questions available</h3>
          <p className="text-xs text-slate-400 mt-1">
            There are currently no exam questions loaded for this specific unit in the local database.
          </p>
        </div>
        <button
          onClick={() => setExamState('pick')}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
        >
          Select Another Chapter
        </button>
      </div>
    );
  }

  // --- VIEW 2: Taking Exam ---
  if (examState === 'taking') {
    const currentQ = questions[currentIndex];
    const isFlagged = flaggedIndices[currentIndex] || false;
    const answeredCount = Object.keys(selectedAnswers).length;
    const feedbackNotice = EvaluationService.getQuestionFeedback(currentQ.question.question_id);

    return (
      <div className="space-y-4 pb-12">
        {/* Top Sticky Bar */}
        <div className="bg-slate-800/95 border border-slate-700/80 rounded-2xl p-3.5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
              Q {currentIndex + 1} of {questions.length}
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Answered: {answeredCount}/{questions.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Timer (enforced in formal mode) */}
            {selectedMode === 'formal' ? (
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold border ${
                  secondsRemaining < 180
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'
                    : 'bg-slate-900 border-slate-700 text-indigo-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTimer(secondsRemaining)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] bg-slate-900 border border-slate-700 text-slate-400 font-medium">
                <Timer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Practice Mode (Untimed)</span>
              </div>
            )}

            <button
              onClick={handleToggleFlag}
              className={`p-2 rounded-lg border text-xs transition-all flex items-center gap-1 cursor-pointer ${
                isFlagged
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="Flag for later review"
            >
              <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span className="hidden md:inline">{isFlagged ? 'Flagged' : 'Flag'}</span>
            </button>

            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg shadow-sm cursor-pointer"
            >
              Finish Exam
            </button>
          </div>
        </div>

        {/* Question History Alert (Enables "You've missed this question 3 times" feedback) */}
        {feedbackNotice.feedbackText && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              feedbackNotice.hasWarning
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                : 'bg-blue-500/15 border-blue-500/40 text-blue-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <span className="font-semibold block">Spaced Repetition Diagnostic</span>
              <span>{feedbackNotice.feedbackText}</span>
            </div>
          </div>
        )}

        {/* Question Content */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 space-y-4 shadow-sm">
          <p className="text-sm md:text-base font-medium text-white leading-relaxed">
            <RichText text={currentQ.question.question_text} />
          </p>

          {/* Option list */}
          <div className="space-y-2">
            {currentQ.options.map((opt, i) => {
              const isSelected = selectedAnswers[currentIndex] === opt.record_id;
              return (
                <button
                  key={opt.record_id}
                  onClick={() => handleOptionSelect(opt.record_id)}
                  className={`w-full p-3.5 rounded-xl border text-xs md:text-sm text-left transition-all flex items-start gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold shadow-sm'
                      : 'bg-slate-900/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="w-5 h-5 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1"><RichText text={opt.option_text} /></span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />}
                </button>
              );
            })}
          </div>

          {/* Nav buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-700/60">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(prev => prev - 1)}
              className="px-3.5 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-xs font-medium flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="text-[11px] text-slate-500 font-mono">
              Q{currentIndex + 1} / {questions.length}
            </span>

            <button
              disabled={currentIndex === questions.length - 1}
              onClick={() => setCurrentIndex(prev => prev + 1)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Question Navigator Grid */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Question Navigator</span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-indigo-500" /> Answered
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-amber-500" /> Flagged
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-slate-900 border border-slate-700" /> Blank
              </span>
            </div>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
            {questions.map((_, idx) => {
              const isAns = !!selectedAnswers[idx];
              const isFlg = !!flaggedIndices[idx];
              const isCur = currentIndex === idx;

              let style = 'bg-slate-900 border-slate-700 text-slate-400';
              if (isCur) style += ' ring-2 ring-indigo-400 font-bold';
              if (isFlg) style = 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold';
              else if (isAns) style = 'bg-indigo-600/30 border-indigo-500 text-white font-semibold';

              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-9 rounded-lg border text-xs flex items-center justify-center transition-all cursor-pointer ${style}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Confirm Submit Modal */}
        {showSubmitConfirm && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-bold text-white">Submit Examination?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  You have answered {answeredCount} out of {questions.length} questions.
                  {questions.length - answeredCount > 0 && (
                    <span className="text-amber-400 block mt-1">
                      ⚠️ {questions.length - answeredCount} unanswered question(s) will be marked incorrect.
                    </span>
                  )}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Keep Working
                </button>
                <button
                  onClick={() => handleSubmitExam(false)}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer"
                >
                  Confirm & Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- VIEW 3: Score Card & Detailed Evaluation Breakdown ---
  const percentage = evalComparison?.scorePercentage || 0;
  const isPassed = evalComparison?.passed || false;
  const prevScore = evalComparison?.previousScore;
  const scoreDiff = evalComparison?.scoreDiff;

  return (
    <div className="space-y-4 pb-12">
      {/* Score Card Header */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 text-center space-y-4 shadow-xl">
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg ${
            isPassed
              ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-emerald-500/20'
              : 'bg-gradient-to-tr from-amber-500 to-rose-400 text-slate-950 shadow-amber-500/20'
          }`}
        >
          <Award className="w-8 h-8" />
        </div>

        <div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isPassed
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
              }`}
            >
              {isPassed ? 'PASSED (≥50% Threshold)' : 'NEEDS REVISION (<50% Threshold)'}
            </span>
          </div>
          <h3 className="text-xl font-bold text-white">Chapter Examination Results</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Unit {selectedChapterId} • {selectedMode === 'formal' ? 'Formal Timed Mode' : 'Practice Mode'}
          </p>
        </div>

        <div className="py-1">
          <div
            className={`text-5xl font-black tabular-nums ${
              isPassed ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {percentage}%
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Raw score: <span className="font-semibold text-white">{finalSession?.correct_answers || 0}</span> / {questions.length} correct
          </p>
        </div>

        {/* Previous Attempt Comparison */}
        <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-700/60 text-left">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Attempt Progress Comparison</span>
            {scoreDiff !== undefined ? (
              <span
                className={`font-bold flex items-center gap-1 ${
                  scoreDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {scoreDiff >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {scoreDiff >= 0 ? `+${scoreDiff}% improvement` : `${scoreDiff}% vs previous`}
              </span>
            ) : (
              <span className="text-indigo-400 font-semibold text-[11px]">First Unit Attempt Logged</span>
            )}
          </div>
          {prevScore !== undefined && (
            <p className="text-[11px] text-slate-400 mt-1">
              Previous Attempt: <span className="text-white font-semibold">{prevScore}%</span> → Current Attempt: <span className="text-white font-semibold">{percentage}%</span>
            </p>
          )}
        </div>

        {/* Exam Tracking Diagnostics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 text-left">
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block text-[10px] uppercase">Time Used</span>
            <p className="font-bold text-white text-sm mt-0.5">
              {formatTimer(evalComparison?.timeUsedSeconds || 0)}
              {selectedMode === 'formal' && <span className="text-slate-400 text-xs font-normal"> / 20m</span>}
            </p>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block text-[10px] uppercase">Flagged Questions</span>
            <p className="font-bold text-amber-400 text-sm mt-0.5">
              {evalComparison?.flaggedCount || 0} flagged
            </p>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block text-[10px] uppercase">Skipped / Blank</span>
            <p className="font-bold text-slate-300 text-sm mt-0.5">
              {evalComparison?.skippedCount || 0} skipped
            </p>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block text-[10px] uppercase">Answer Changes</span>
            <p className="font-bold text-indigo-400 text-sm mt-0.5">
              {evalComparison?.answerChanges || 0} changes
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            onClick={handleStartExam}
            className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake Exam</span>
          </button>
          <button
            onClick={() => setExamState('pick')}
            className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium text-xs rounded-xl transition-all cursor-pointer"
          >
            <span>Choose Another Chapter</span>
          </button>
        </div>
      </div>

      {/* Section-by-Section Diagnostic Breakdown Card */}
      {sectionBreakdown.length > 0 && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>Section-by-Section Mastery Breakdown</span>
          </h4>
          <p className="text-xs text-slate-400">
            Identifies mastery per curriculum section. Sections below 60% are flagged as weak areas.
          </p>

          <div className="space-y-2 pt-1">
            {sectionBreakdown.map(sec => (
              <div
                key={sec.section_id}
                className="p-3 bg-slate-900/70 border border-slate-700/60 rounded-xl flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{sec.section_title}</span>
                    {sec.is_weak && (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold">
                        Weak Area (&lt;60%)
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {sec.correct_count} of {sec.total_questions} questions correct
                  </span>
                </div>

                <div className="text-right">
                  <span
                    className={`text-sm font-bold ${
                      sec.percentage >= 60 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {sec.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-Question Detailed Review */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          <span>Full Question Review & Explanations</span>
        </h4>

        <div className="space-y-3">
          {questions.map((qItem, idx) => {
            const chosenOptionId = selectedAnswers[idx];
            const chosenOption = qItem.options.find(o => o.record_id === chosenOptionId);
            const correctOption = qItem.options.find(o => o.is_correct === 1);
            const isCorrect = chosenOption?.is_correct === 1;

            return (
              <div
                key={qItem.question.question_id}
                className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-700/60 space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-slate-400 shrink-0 mt-0.5">
                      Q{idx + 1}.
                    </span>
                    <p className="font-medium text-white"><RichText text={qItem.question.question_text} /></p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md font-semibold text-[10px] shrink-0 ${
                      isCorrect ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {isCorrect ? 'Correct' : 'Missed'}
                  </span>
                </div>

                <div className="text-[11px] space-y-0.5 pl-5">
                  <p className="text-slate-400">
                    Your answer: <span className={isCorrect ? 'text-emerald-300 font-medium' : 'text-rose-300 font-medium'}><RichText text={chosenOption?.option_text || '(Skipped)'} /></span>
                  </p>
                  {!isCorrect && (
                    <p className="text-slate-400">
                      Correct answer: <span className="text-emerald-300 font-medium"><RichText text={correctOption?.option_text || ''} /></span>
                    </p>
                  )}
                </div>

                {qItem.question.explanation && (
                  <div className="mt-1 pl-5 pt-1 text-[11px] text-slate-400 border-t border-slate-800">
                    <span className="font-semibold text-slate-300">Explanation: </span>
                    <RichText text={qItem.question.explanation} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
