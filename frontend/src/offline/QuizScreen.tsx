/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { sqliteDb } from './db';
import { EvaluationService } from './evaluation';
import { RichText } from '../lib/content';
import type {
  Quiz,
  QuizOption,
  QuizSession,
  QuizAnswer,
  TextbookChapter,
  TextbookSection,
  QuestionHistoryItem
} from './types';
import confetti from './confetti';
import {
  BrainCircuit,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
  RotateCcw,
  ArrowRight,
  BookOpen,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  Clock,
  Target,
  History,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface Props {
  initialStbId?: string | null;
  initialChapterId?: number | null;
  initialSectionId?: string | null;
  isRemediationMode?: boolean;
  onNavigateToStudy: () => void;
  onClearRemediationMode?: () => void;
}

interface QuizEvalResult {
  scorePercentage: number;
  rawScore: number;
  totalQ: number;
  isWeak: boolean;
  attemptCount: number;
  bestScore: number;
  timePerQuestion: number;
}

export const QuizScreen: React.FC<Props> = ({
  initialStbId,
  initialChapterId,
  initialSectionId,
  isRemediationMode = false,
  onNavigateToStudy,
  onClearRemediationMode
}) => {
  const textbooks = sqliteDb.getTextbooks();
  const metadata = sqliteDb.getAppMetadata();

  // Selection state
  const [selectedBookId, setSelectedBookId] = useState<string>(initialStbId || textbooks[0]?.stb_id || '');
  const [chapters, setChapters] = useState<TextbookChapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<number>(initialChapterId || 1);
  const [sections, setSections] = useState<TextbookSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>(initialSectionId || '');

  // Quiz running state
  const [quizState, setQuizState] = useState<'pick' | 'running' | 'results'>('pick');
  const [isAdaptivePractice, setIsAdaptivePractice] = useState(false);
  const [questionsList, setQuestionsList] = useState<{ quiz: Quiz; options: QuizOption[]; missedCount?: number }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [sessionAnswers, setSessionAnswers] = useState<QuizAnswer[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [evalResult, setEvalResult] = useState<QuizEvalResult | null>(null);
  const [remediationEmpty, setRemediationEmpty] = useState(false);

  // Sync chapters and sections when selected book changes
  useEffect(() => {
    if (selectedBookId) {
      const chs = sqliteDb.getChapters(selectedBookId);
      setChapters(chs);
      const activeCh = chs[0]?.chapter_id || 1;
      setSelectedChapterId(activeCh);
      const secs = sqliteDb.getSections(selectedBookId, activeCh);
      setSections(secs);
      setSelectedSectionId(secs[0]?.section_id || '');
    }
  }, [selectedBookId]);

  useEffect(() => {
    if (selectedBookId && selectedChapterId) {
      const secs = sqliteDb.getSections(selectedBookId, selectedChapterId);
      setSections(secs);
      setSelectedSectionId(secs[0]?.section_id || '');
    }
  }, [selectedChapterId]);

  // If initial props are passed, start directly
  useEffect(() => {
    if (isRemediationMode) {
      startRemediationPractice();
      if (onClearRemediationMode) onClearRemediationMode();
    } else if (initialStbId && initialChapterId && initialSectionId) {
      setSelectedBookId(initialStbId);
      setSelectedChapterId(initialChapterId);
      setSelectedSectionId(initialSectionId);
      startQuiz(initialStbId, initialChapterId, initialSectionId);
    }
  }, [initialStbId, initialChapterId, initialSectionId, isRemediationMode]);

  const startRemediationPractice = () => {
    const remediationList = sqliteDb.getAdaptiveRemediationQuestions(10);
    if (remediationList.length === 0) {
      setRemediationEmpty(true);
      setQuizState('pick');
      return;
    }
    setRemediationEmpty(false);
    setQuestionsList(remediationList);
    setIsAdaptivePractice(true);
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setIsAnswerSubmitted(false);
    setSessionAnswers([]);
    setCorrectCount(0);
    setStartTime(Date.now());
    setEvalResult(null);
    setQuizState('running');
  };

  const startQuiz = (stb: string, ch: number, sec: string) => {
    setRemediationEmpty(false);
    const list = sqliteDb.getQuizQuestions(stb, ch, sec);
    if (list.length === 0) {
      // Fallback: stay within the chapter pool so quizzes are never book-wide
      const fallbackList = sqliteDb.getQuizQuestions(stb, ch);
      setQuestionsList(fallbackList.slice(0, 10));
    } else {
      setQuestionsList(list);
    }
    setIsAdaptivePractice(false);
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setIsAnswerSubmitted(false);
    setSessionAnswers([]);
    setCorrectCount(0);
    setStartTime(Date.now());
    setEvalResult(null);
    setQuizState('running');
  };

  const handleSelectOption = (optionRecordId: string) => {
    if (isAnswerSubmitted) return;
    setSelectedOptionId(optionRecordId);
  };

  const handleSubmitAnswer = () => {
    if (!selectedOptionId || isAnswerSubmitted) return;

    const currentItem = questionsList[currentIndex];
    const chosenOption = currentItem.options.find(o => o.record_id === selectedOptionId);
    const isCorrect = chosenOption?.is_correct === 1;

    setIsAnswerSubmitted(true);
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    }

    const answerRecord: QuizAnswer = {
      answer_id: 'ans_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      quiz_id: currentItem.quiz.quiz_id,
      session_id: '', // filled upon session save
      answer_text: chosenOption?.option_text || '',
      points: isCorrect ? currentItem.quiz.points : 0,
      answered_at: new Date().toISOString(),
      is_correct: isCorrect ? 1 : 0,
      question_order: currentIndex + 1
    };

    setSessionAnswers(prev => [...prev, answerRecord]);
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questionsList.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOptionId(null);
      setIsAnswerSubmitted(false);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    const durationSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const totalQ = Math.max(1, questionsList.length);

    // Score = (correct / total) * 100, capped at 100
    const finalPercentage = EvaluationService.computePercentageScore(correctCount, totalQ);
    const timePerQ = Math.round(durationSeconds / totalQ);

    const sessionId = 'qzs_' + Date.now().toString(36);
    const session: QuizSession = {
      session_id: sessionId,
      stb_id: isAdaptivePractice ? 'REMEDIATION_ADAPTIVE' : selectedBookId,
      chapter_id: isAdaptivePractice ? 0 : selectedChapterId,
      section_id: isAdaptivePractice ? 'MISSED_PRACTICE' : selectedSectionId,
      session_type: isAdaptivePractice ? 'remediation_practice' : 'section_quiz',
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
      overall_score: finalPercentage,
      ended_at: new Date().toISOString(),
      attempt_number: 1,
      quiz_type: isAdaptivePractice ? 'Targeted Remediation Practice' : 'Section Mastery Quiz (10 Qs)',
      total_questions: totalQ,
      time_spent_seconds: durationSeconds
    };

    const finalizedAnswers = sessionAnswers.map(a => ({
      ...a,
      session_id: sessionId
    }));

    // Record question_history items
    const textbookObj = textbooks.find(t => t.stb_id === selectedBookId);
    const questionHistoryItems: Omit<QuestionHistoryItem, 'history_id'>[] = questionsList.map((item, idx) => {
      const q = item.quiz;
      const ans = sessionAnswers[idx];
      const isCorrect = ans ? ans.is_correct === 1 : false;
      const chosenText = ans ? ans.answer_text : '';
      const correctOption = item.options.find(o => o.is_correct === 1);
      return {
        question_id: q.quiz_id,
        assessment_type: 'quiz',
        question_text: q.quiz_text,
        selected_answer: chosenText,
        correct_answer: correctOption?.option_text || '',
        was_correct: isCorrect ? 1 : 0,
        time_spent_ms: Math.round((durationSeconds / totalQ) * 1000),
        answered_at: new Date().toISOString(),
        stb_id: selectedBookId,
        chapter_id: selectedChapterId,
        section_id: selectedSectionId,
        subject_name: textbookObj?.title || 'Curriculum',
        explanation: q.explanation
      };
    });

    // Record to SQLite database and update evaluation layers
    const recordedEval = sqliteDb.recordQuizSession(session, finalizedAnswers, questionHistoryItems);

    setEvalResult({
      scorePercentage: recordedEval.scorePercentage,
      rawScore: correctCount,
      totalQ,
      isWeak: recordedEval.isWeak,
      attemptCount: recordedEval.attemptCount,
      bestScore: recordedEval.bestScore,
      timePerQuestion: timePerQ
    });

    if (finalPercentage >= 70) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }
    }

    setQuizState('results');
  };

  // --- VIEW 1: Pick Textbook, Chapter, Section ---
  if (quizState === 'pick') {
    return (
      <div className="space-y-4 pb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {metadata.grade_label} Practice Quizzes
            </h2>
            <p className="text-xs text-slate-400">
              10 randomized questions with evaluation metrics & question history
            </p>
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-4 shadow-sm">
          {/* Targeted Remediation Practice entry */}
          <div className="bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/30 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white">Targeted Remediation Practice Mode</span>
              <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[9px] font-bold uppercase border border-emerald-500/30">
                Auto-Adaptive
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Only questions you have missed in <span className="text-amber-300 font-bold">2 or more</span> past
              sessions are surfaced, ranked by how often they were missed — so you drill exactly what needs work.
            </p>

            {remediationEmpty ? (
              <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-emerald-300/90 leading-relaxed">
                  No questions missed 2+ times yet. Keep practicing — any question you get wrong in two or more
                  assessments will automatically be flagged here for targeted revision.
                </p>
              </div>
            ) : (
              <button
                onClick={startRemediationPractice}
                className="w-full py-2.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Target className="w-4 h-4" />
                <span>Start Targeted Remediation Practice</span>
              </button>
            )}
          </div>

          {/* Step 1: Select Textbook */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              1. Select Subject Textbook
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {textbooks.map(b => (
                <button
                  key={b.stb_id}
                  onClick={() => setSelectedBookId(b.stb_id)}
                  className={`p-3 rounded-xl text-left border text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                    selectedBookId === b.stb_id
                      ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm'
                      : 'bg-slate-900/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold">{b.title}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Select Chapter */}
          {chapters.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                2. Select Unit / Chapter
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {chapters.map(ch => (
                  <button
                    key={ch.chapter_id}
                    onClick={() => setSelectedChapterId(ch.chapter_id)}
                    className={`p-3 rounded-xl text-left border text-xs transition-all flex items-center justify-between cursor-pointer ${
                      selectedChapterId === ch.chapter_id
                        ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm font-semibold'
                        : 'bg-slate-900/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                        Unit {ch.chapter_id}
                      </span>
                      <span>{ch.chapter_title}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Select Section */}
          {sections.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                3. Select Specific Section
              </label>
              <div className="grid grid-cols-1 gap-2">
                {sections.map(sec => {
                  const stats = sqliteDb.getSectionQuizStats(selectedBookId, selectedChapterId, sec.section_id);
                  return (
                    <button
                      key={sec.section_id}
                      onClick={() => setSelectedSectionId(sec.section_id)}
                      className={`p-3 rounded-xl text-left border text-xs transition-all flex items-center justify-between cursor-pointer ${
                        selectedSectionId === sec.section_id
                          ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm font-semibold'
                          : 'bg-slate-900/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono">Sec {sec.section_id}</span>
                          <span className="font-medium text-white">{sec.section_title}</span>
                        </div>
                        {stats.attemptCount > 0 && (
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                            <span>Attempts: {stats.attemptCount}</span>
                            <span>•</span>
                            <span className={stats.isWeak ? 'text-amber-400 font-semibold' : 'text-emerald-400'}>
                              Latest: {stats.latestScore}% {stats.isWeak && '(Weak Section <60%)'}
                            </span>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => startQuiz(selectedBookId, selectedChapterId, selectedSectionId)}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Launch 10-Question Quiz</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle empty question set gracefully
  if (quizState === 'running' && questionsList.length === 0) {
    return (
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">No questions available</h3>
          <p className="text-xs text-slate-400 mt-1">
            There are currently no quiz questions loaded for this specific section in the local database.
          </p>
        </div>
        <button
          onClick={() => setQuizState('pick')}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
        >
          Select Another Section
        </button>
      </div>
    );
  }

  // --- VIEW 2: Quiz In Progress ---
  if (quizState === 'running') {
    const currentItem = questionsList[currentIndex];
    const progressPercent = Math.round(((currentIndex + 1) / questionsList.length) * 100);
    const feedbackNotice = EvaluationService.getQuestionFeedback(currentItem.quiz.quiz_id);

    return (
      <div className="space-y-4 pb-8">
        {/* Top Quiz Header & Progress */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
              Question {currentIndex + 1} of {questionsList.length}
            </span>
            <span className="text-xs text-slate-400">
              Score: {correctCount} correct
            </span>
          </div>

          <button
            onClick={() => setQuizState('pick')}
            className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            Quit Quiz
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-slate-700/60 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
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

        {/* Question Card */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 space-y-4 shadow-md">
          <p className="text-sm md:text-base font-medium text-white leading-relaxed">
            <RichText text={currentItem.quiz.quiz_text} />
          </p>

          {/* Options */}
          <div className="space-y-2">
            {currentItem.options.map((opt, i) => {
              const isSelected = selectedOptionId === opt.record_id;
              const isOptionCorrect = opt.is_correct === 1;

              let style = 'bg-slate-900/60 border-slate-700/60 text-slate-200 hover:bg-slate-800 cursor-pointer';

              if (isAnswerSubmitted) {
                if (isOptionCorrect) {
                  style = 'bg-emerald-950/40 border-emerald-500 text-emerald-200 font-semibold';
                } else if (isSelected && !isOptionCorrect) {
                  style = 'bg-rose-950/40 border-rose-500 text-rose-200 font-semibold';
                } else {
                  style = 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60';
                }
              } else if (isSelected) {
                style = 'bg-emerald-600/20 border-emerald-500 text-white font-medium shadow-sm';
              }

              return (
                <button
                  key={opt.record_id}
                  disabled={isAnswerSubmitted}
                  onClick={() => handleSelectOption(opt.record_id)}
                  className={`w-full p-3.5 rounded-xl border text-xs md:text-sm text-left transition-all flex items-start gap-3 ${style}`}
                >
                  <span className="w-5 h-5 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1"><RichText text={opt.option_text} /></span>
                  {isAnswerSubmitted && isOptionCorrect && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  {isAnswerSubmitted && isSelected && !isOptionCorrect && (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Per-question explanation feedback */}
          {isAnswerSubmitted && currentItem.quiz.explanation && (
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Explanation & Curriculum Reference:</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                <RichText text={currentItem.quiz.explanation} />
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-500">
              {isAnswerSubmitted ? 'Press Next to advance' : 'Select an option to check'}
            </span>

            {!isAnswerSubmitted ? (
              <button
                disabled={!selectedOptionId}
                onClick={handleSubmitAnswer}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Submit Answer
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>{currentIndex + 1 === questionsList.length ? 'View Results & Evaluation' : 'Next Question'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW 3: Final Score Summary & Evaluation Feedback ---
  const finalPercentage = evalResult?.scorePercentage || 0;
  const isWeak = evalResult?.isWeak || false;

  return (
    <div className="space-y-4 pb-12">
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          <Award className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-xl font-bold text-white">Quiz Evaluation Completed</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Recorded to offline SQLite tables (quiz_sessions, quiz_answers, question_history)
          </p>
        </div>

        {/* Score & Threshold Badge */}
        <div className="py-2">
          <div className="text-4xl font-extrabold text-emerald-400 tabular-nums">
            {finalPercentage}%
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Raw score: <span className="font-semibold text-white">{correctCount}</span> / {questionsList.length} correct
          </p>
        </div>

        {/* Weak Section Alert (< 60%) */}
        {isWeak ? (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-left flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-300">Weak Section Identified (&lt;60% Mastery)</p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                This section has been flagged as a weak area and surfaced on your Dashboard. We recommend reading the textbook notes before your chapter exam.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-left flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs text-emerald-300 font-medium">
              Great job! Section mastery score exceeds the 60% standard threshold.
            </span>
          </div>
        )}

        {/* Evaluation Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 text-left">
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Time / Question</span>
            </div>
            <p className="font-bold text-white text-sm">{evalResult?.timePerQuestion || 0}s</p>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
              <Target className="w-3.5 h-3.5" />
              <span>Attempt Count</span>
            </div>
            <p className="font-bold text-white text-sm">Attempt #{evalResult?.attemptCount || 1}</p>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Best Score</span>
            </div>
            <p className="font-bold text-emerald-400 text-sm">{evalResult?.bestScore || finalPercentage}%</p>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
              <History className="w-3.5 h-3.5" />
              <span>Latest Score</span>
            </div>
            <p className="font-bold text-white text-sm">{finalPercentage}%</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            onClick={() => startQuiz(selectedBookId, selectedChapterId, selectedSectionId)}
            className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake 10 Questions</span>
          </button>
          <button
            onClick={onNavigateToStudy}
            className="flex-1 py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Review Section Notes</span>
          </button>
          <button
            onClick={() => setQuizState('pick')}
            className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium text-xs rounded-xl transition-all cursor-pointer"
          >
            <span>Choose Another Topic</span>
          </button>
        </div>
      </div>

      {/* Per-Question Detailed Feedback Review */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Question-by-Question Evaluation & Explanations</span>
        </h4>

        <div className="space-y-3">
          {questionsList.map((item, idx) => {
            const ans = sessionAnswers[idx];
            const isCorrect = ans ? ans.is_correct === 1 : false;
            const correctOpt = item.options.find(o => o.is_correct === 1);

            return (
              <div
                key={item.quiz.quiz_id}
                className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-700/60 space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-slate-400 shrink-0 mt-0.5">
                      Q{idx + 1}.
                    </span>
                    <p className="font-medium text-white"><RichText text={item.quiz.quiz_text} /></p>
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
                    Your answer: <span className={isCorrect ? 'text-emerald-300 font-medium' : 'text-rose-300 font-medium'}><RichText text={ans?.answer_text || '(Not Answered)'} /></span>
                  </p>
                  {!isCorrect && (
                    <p className="text-slate-400">
                      Correct answer: <span className="text-emerald-300 font-medium"><RichText text={correctOpt?.option_text || ''} /></span>
                    </p>
                  )}
                </div>

                {item.quiz.explanation && (
                  <div className="mt-1 pl-5 pt-1 text-[11px] text-slate-400 border-t border-slate-800">
                    <span className="font-semibold text-slate-300">Explanation: </span>
                    <RichText text={item.quiz.explanation} />
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
