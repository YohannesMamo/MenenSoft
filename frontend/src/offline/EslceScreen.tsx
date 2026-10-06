/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { sqliteDb } from './db';
import { EvaluationService } from './evaluation';
import { FREE_DAILY_PRACTICE_LIMIT, isPremium } from './licensing';
import { RichText } from '../lib/content';
import type {
  EslceStudentSession,
  EslceStudentResponse,
  QuestionHistoryItem,
  EslcePredictionRecord
} from './types';
import confetti from './confetti';
import {
  School,
  Filter,
  Flag,
  BookOpen,
  CheckCircle2,
  Award,
  ChevronLeft,
  ChevronRight,
  Split,
  RotateCcw,
  BarChart3,
  Calendar,
  AlertCircle,
  ClipboardList,
  XCircle,
  Lock
} from 'lucide-react';

interface EslceScreenProps {
  onUpgrade?: () => void;
}

export const EslceScreen: React.FC<EslceScreenProps> = ({ onUpgrade }) => {
  const subjects = sqliteDb.getEslceSubjects();
  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(1);
  const [selectedYear, setSelectedYear] = useState<number>(0);
  const [examMode, setExamMode] = useState<'practice' | 'exam'>('exam');
  const [examForum, setExamForum] = useState<'all' | 'past' | 'predicted'>('all');

  // Offline license / free-tier gate (Menen Verify)
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const premium = isPremium();
  const freeRunsLeft = Math.max(0, FREE_DAILY_PRACTICE_LIMIT - sqliteDb.countTodayPracticeSessions());

  // All years actually present in the bundled ESLCE bank for this subject
  // (official past papers only — the predicted 2026 sets are year-tagged
  // 'predicted' and surfaced through the forum filter below).
  const years = [...new Set(sqliteDb.getEslceExams(selectedSubjectId, undefined, 'past').map(e => e.year))]
    .sort((a, b) => b - a)
    .filter(y => y >= 2005);

  useEffect(() => {
    if (years.length > 0) setSelectedYear(years[0]);
  }, [selectedSubjectId]);

  const pastExams = sqliteDb.getEslceExams(
    selectedSubjectId,
    examForum === 'predicted' ? undefined : selectedYear || undefined,
    'past'
  );
  const predictedExams = sqliteDb.getEslceExams(selectedSubjectId, undefined, 'predicted');
  const exams =
    examForum === 'past'
      ? pastExams
      : examForum === 'predicted'
        ? predictedExams
        : [...pastExams, ...predictedExams];
  const [activeExamId, setActiveExamId] = useState<number | null>(null);

  // Active exam runner state
  const [examDetail, setExamDetail] = useState<ReturnType<typeof sqliteDb.getEslceExamDetail>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({}); // index -> optionId
  const [flaggedIndices, setFlaggedIndices] = useState<Record<number, boolean>>({});
  const [showPassageDrawer, setShowPassageDrawer] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [sessionSummary, setSessionSummary] = useState<EslceStudentSession | null>(null);
  const [evalResult, setEvalResult] = useState<{
    estimatedScaledScore: number;
    passedSubject: boolean;
    percentage: number;
    prediction: EslcePredictionRecord | null;
    timePerQ: number;
    passageAccuracy: number;
  } | null>(null);

  const startExam = (examId: number) => {
    const detail = sqliteDb.getEslceExamDetail(examId);
    if (!detail) return;
    if (!premium) {
      if (detail.exam.exam_type === 'predicted') {
        setGateMessage('Predicted 2026 papers are part of the premium plan. Activate your offline license to access them.');
        return;
      }
      if (examMode === 'practice' && sqliteDb.countTodayPracticeSessions() >= FREE_DAILY_PRACTICE_LIMIT) {
        setGateMessage(`Free plan: ${FREE_DAILY_PRACTICE_LIMIT} practice runs per day. Premium unlocks unlimited practice.`);
        return;
      }
    }
    setGateMessage(null);
    setExamDetail(detail);
    setActiveExamId(examId);
    setCurrentIndex(0);
    setSelectedOptions({});
    setFlaggedIndices({});
    setShowPassageDrawer(true);
    setIsFinished(false);
    setShowReview(false);
    setSessionStartTime(Date.now());
    setSessionSummary(null);
    setEvalResult(null);
  };

  const handleSelectOption = (optionId: number) => {
    setSelectedOptions({
      ...selectedOptions,
      [currentIndex]: optionId
    });
  };

  const handleToggleFlag = () => {
    setFlaggedIndices({
      ...flaggedIndices,
      [currentIndex]: !flaggedIndices[currentIndex]
    });
  };

  const handleSubmitEslce = () => {
    if (!examDetail) return;

    let correct = 0;
    let wrong = 0;
    let unanswered = 0;
    let passageTotal = 0;
    let passageCorrect = 0;

    const totalQ = Math.max(1, examDetail.questions.length);
    const responses: EslceStudentResponse[] = [];
    const durationMs = Math.max(1000, Date.now() - (sessionStartTime || Date.now()));

    // DO NOT recompute is_correct for ESLCE questions—it is precomputed in the database
    examDetail.questions.forEach((qItem, idx) => {
      const chosenOptionId = selectedOptions[idx];
      const hasPassage = !!qItem.passage;
      if (hasPassage) passageTotal++;

      if (!chosenOptionId) {
        unanswered++;
        responses.push({
          id: 0,
          session_id: 0,
          question_id: qItem.question.id,
          selected_option_id: undefined,
          is_correct: 0, // precomputed default for unanswered
          verdict: 'unanswered',
          created_at: new Date().toISOString()
        });
      } else {
        const option = qItem.options.find(o => o.id === chosenOptionId);
        // Precomputed is_correct from database schema
        const isRight = option?.is_correct === 1;
        if (isRight) {
          correct++;
          if (hasPassage) passageCorrect++;
        } else {
          wrong++;
        }

        responses.push({
          id: 0,
          session_id: 0,
          question_id: qItem.question.id,
          selected_option_id: chosenOptionId,
          is_correct: isRight ? 1 : 0,
          verdict: isRight ? 'correct' : 'wrong',
          created_at: new Date().toISOString()
        });
      }
    });

    // Score = (correct / total) * 100, capped strictly at 100
    const percentage = EvaluationService.computePercentageScore(correct, totalQ);
    const sessionKey = 'eslce_' + Date.now().toString(36);

    const session: EslceStudentSession = {
      id: Date.now(),
      session_key: sessionKey,
      subject_name: examDetail.subject.name,
      exam_id: examDetail.exam.id,
      exam_type: examDetail.exam.exam_type,
      mode: examMode,
      source_year: examDetail.exam.year,
      title: examDetail.exam.title,
      total_questions: totalQ,
      correct_count: correct,
      wrong_count: wrong,
      unanswered_count: unanswered,
      percentage: percentage,
      time_spent_ms: durationMs,
      created_at: new Date(sessionStartTime || Date.now()).toISOString(),
      completed_at: new Date().toISOString()
    };

    // Question history batch items
    const questionHistoryItems: Omit<QuestionHistoryItem, 'history_id'>[] = examDetail.questions.map((qItem, idx) => {
      const chosenOptionId = selectedOptions[idx];
      const chosenOption = qItem.options.find(o => o.id === chosenOptionId);
      const correctOption = qItem.options.find(o => o.is_correct === 1);
      const isRight = chosenOption?.is_correct === 1;

      return {
        question_id: String(qItem.question.id),
        assessment_type: 'eslce',
        question_text: qItem.question.question_text,
        selected_answer: chosenOption?.option_text || '(Unanswered)',
        correct_answer: correctOption?.option_text || '',
        was_correct: isRight ? 1 : 0,
        time_spent_ms: Math.round(durationMs / totalQ),
        answered_at: new Date().toISOString(),
        subject_name: examDetail.subject.name,
        explanation: qItem.question.explanation
      };
    });

    const res = sqliteDb.recordEslceSession(session, responses, questionHistoryItems);
    const latestPrediction = sqliteDb.getLatestEslcePrediction();

    const passageAccuracy = passageTotal > 0 ? Math.round((passageCorrect / passageTotal) * 100) : 80;
    const timePerQ = Math.round(durationMs / (totalQ * 1000));

    setSessionSummary(session);
    setEvalResult({
      estimatedScaledScore: res.estimatedScaledScore,
      passedSubject: res.passedSubject,
      percentage: res.percentage,
      prediction: latestPrediction,
      timePerQ,
      passageAccuracy
    });
    setIsFinished(true);

    if (percentage >= 50) {
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
    }
  };

  // --- VIEW 1: Filter & Select ESLCE Exam ---
  if (!activeExamId || !examDetail) {
    return (
      <div className="space-y-4 pb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <School className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              ESLCE National Examination Bank
            </h2>
            <p className="text-xs text-slate-400">
              Grade 12 Ethiopian national exam past papers & predicted 2026 sets with reading passages & 0–700 scaled score evaluation
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span>Filter National Papers</span>
          </div>

          {/* Exam Forum: past vs predicted, side by side */}
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { id: 'all', label: 'All Papers' },
              { id: 'past', label: 'Past Exams' },
              { id: 'predicted', label: 'Predicted 2026' }
            ] as const).map(f => (
              <button
                key={f.id}
                onClick={() => setExamForum(f.id)}
                className={`py-2 px-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                  examForum === f.id
                    ? f.id === 'predicted'
                      ? 'bg-purple-500/20 border-purple-500/60 text-purple-300'
                      : 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Subject Filter */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Subject</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Year Filter */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Exam Year (E.C.)</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                {years.length === 0 && <option value={0}>No years available</option>}
                {years.map((yr, i) => (
                  <option key={yr} value={yr}>
                    {yr} E.C.{i === 0 ? ' (Latest Official)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode Selection */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Mode</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setExamMode('exam')}
                  className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    examMode === 'exam'
                      ? 'bg-amber-500/20 border border-amber-500 text-amber-300'
                      : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  Exam Mode
                </button>
                <button
                  onClick={() => setExamMode('practice')}
                  className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    examMode === 'practice'
                      ? 'bg-amber-500/20 border border-amber-500 text-amber-300'
                      : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  Practice
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Free / Premium banner */}
        {!premium && (
          <div className="flex items-start justify-between gap-3 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-300 leading-relaxed">
                <span className="font-bold text-amber-300">Free plan</span> — {freeRunsLeft} practice run{freeRunsLeft === 1 ? '' : 's'} left
                today; past papers are open, but predicted 2026 sets and unlimited practice are locked.
              </div>
            </div>
            <button
              onClick={onUpgrade}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold transition-all cursor-pointer"
            >
              Activate
            </button>
          </div>
        )}

        {gateMessage && (
          <div className={`flex items-start gap-2.5 p-3 rounded-2xl border text-xs ${
            premium ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-purple-500/10 border-purple-500/40 text-purple-200'
          }`}>
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">{gateMessage}</div>
            {!premium && (
              <button
                onClick={onUpgrade}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-white text-[11px] font-bold transition-all cursor-pointer"
              >
                Activate
              </button>
            )}
          </div>
        )}

        {/* Exams List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              {examForum === 'predicted' ? 'Predicted Exam Papers' : 'Available National Exam Papers'} ({exams.length})
            </span>
            <span>Grade 12 Curriculum Benchmark</span>
          </div>

          {exams.length === 0 ? (
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 text-center text-slate-400">
              <AlertCircle className="w-8 h-8 mx-auto text-amber-400 mb-2" />
              <p className="text-sm font-semibold text-white">No papers found</p>
              <p className="text-xs text-slate-400 mt-1">
                {examForum === 'predicted'
                  ? 'No predicted 2026 sets are bundled for this subject yet. Try a different subject.'
                  : 'No past papers found for this subject and year. Try selecting another year, subject, or the Predicted forum.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {exams.map(exam => (
                <div
                  key={exam.id}
                  className="bg-slate-800/80 border border-slate-700/80 hover:border-amber-500/50 rounded-2xl p-4.5 transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          exam.exam_type === 'predicted'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {exam.year} E.C.
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          exam.exam_type === 'predicted'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                        }`}
                      >
                        {exam.exam_type === 'predicted' ? 'Predicted' : 'Past'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {exam.total_questions} Questions • {exam.duration_minutes} Mins
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white tracking-tight">{exam.title}</h3>
                    <p className="text-xs text-slate-400">
                      {exam.exam_type === 'predicted'
                        ? 'Predicted national exam set generated from the modelled question bank (2026 E.C.)'
                        : 'Standard Ethiopian University Entrance Examination paper'}
                    </p>
                  </div>

                  <button
                    onClick={() => startExam(exam.id)}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <span>{exam.exam_type === 'predicted' && !premium ? 'Locked' : 'Start National Paper'}</span>
                    {exam.exam_type === 'predicted' && !premium ? <Lock className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- VIEW 2: Active ESLCE Exam Taking (With Reading Passages) ---
  if (!isFinished) {
    const currentQ = examDetail.questions[currentIndex];
    const isFlagged = flaggedIndices[currentIndex] || false;
    const passage = currentQ.passage;
    const answeredCount = Object.keys(selectedOptions).length;

    return (
      <div className="space-y-4 pb-12">
        {/* Top Control Bar */}
        <div className="bg-slate-800/95 border border-slate-700/80 rounded-2xl p-3.5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
              ESLCE Q {currentIndex + 1} of {examDetail.questions.length}
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Answered: {answeredCount}/{examDetail.questions.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {passage && (
              <button
                onClick={() => setShowPassageDrawer(!showPassageDrawer)}
                className={`p-2 rounded-lg border text-xs transition-all flex items-center gap-1 cursor-pointer ${
                  showPassageDrawer
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
                title="Toggle Reading Passage"
              >
                <Split className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{showPassageDrawer ? 'Hide Passage' : 'View Passage'}</span>
              </button>
            )}

            <button
              onClick={handleToggleFlag}
              className={`p-2 rounded-lg border text-xs transition-all flex items-center gap-1 cursor-pointer ${
                isFlagged
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="Flag question"
            >
              <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span className="hidden md:inline">{isFlagged ? 'Flagged' : 'Flag'}</span>
            </button>

            <button
              onClick={handleSubmitEslce}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-sm cursor-pointer"
            >
              Finish Paper
            </button>
          </div>
        </div>

        {/* Layout: Reading Passage (if applicable) alongside Question */}
        <div className={`grid gap-4 ${passage && showPassageDrawer ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Left: Reading Passage Card */}
          {passage && showPassageDrawer && (
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 space-y-3 shadow-sm h-fit">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 border-b border-slate-700/80 pb-2">
                <BookOpen className="w-4 h-4" />
                <span>Reading Passage: {passage.title}</span>
              </div>
              <div className="text-xs md:text-sm text-slate-300 leading-relaxed max-h-[380px] overflow-y-auto pr-2 space-y-2">
                {passage.passage_content.split('\n\n').map((para: string, i: number) => (
                  <p key={i} className="mb-2"><RichText text={para} /></p>
                ))}
              </div>
            </div>
          )}

          {/* Right: Question and Multiple Choice Options */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 space-y-4 shadow-sm">
            <div>
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block mb-1">
                {examDetail.subject.name} • {examDetail.exam.year} E.C.
              </span>
              <p className="text-sm md:text-base font-medium text-white leading-relaxed">
                <RichText text={currentQ.question.question_text} />
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2">
              {currentQ.options.map((opt, i) => {
                const isSelected = selectedOptions[currentIndex] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(opt.id)}
                    className={`w-full p-3.5 rounded-xl border text-xs md:text-sm text-left transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-white font-semibold shadow-sm'
                        : 'bg-slate-900/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1"><RichText text={opt.option_text} /></span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>

            {/* Stepper Navigation */}
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
                Q{currentIndex + 1} / {examDetail.questions.length}
              </span>

              <button
                disabled={currentIndex === examDetail.questions.length - 1}
                onClick={() => setCurrentIndex(prev => prev + 1)}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:pointer-events-none text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Question Navigator */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Question Matrix</span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-amber-500" /> Answered
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-orange-500" /> Flagged
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-slate-900 border border-slate-700" /> Unanswered
              </span>
            </div>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
            {examDetail.questions.map((_, idx) => {
              const isAns = selectedOptions[idx] !== undefined;
              const isFlg = !!flaggedIndices[idx];
              const isCur = currentIndex === idx;

              let style = 'bg-slate-900 border-slate-700 text-slate-400';
              if (isCur) style += ' ring-2 ring-amber-400 font-bold';
              if (isFlg) style = 'bg-orange-500/20 border-orange-500 text-orange-300 font-bold';
              else if (isAns) style = 'bg-amber-500/30 border-amber-500 text-white font-semibold';

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
      </div>
    );
  }

  // --- VIEW 3: Final ESLCE Results & Scaled Score Evaluation ---
  const scaledScore = evalResult?.estimatedScaledScore || 0;
  const passedSubject = evalResult?.passedSubject || false;
  const percentage = evalResult?.percentage || 0;
  const prediction = evalResult?.prediction;

  return (
    <div className="space-y-4 pb-12">
      {/* ESLCE Scaled Score Header Card */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
          <Award className="w-8 h-8" />
        </div>

        <div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                passedSubject
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
              }`}
            >
              {passedSubject ? 'PASS PREDICTION (≥350/700 Standard)' : 'FAIL PREDICTION (<350/700 Standard)'}
            </span>
          </div>
          <h3 className="text-xl font-bold text-white">ESLCE Evaluation Complete</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {examDetail.subject.name} • {examDetail.exam.year} E.C. National Paper
          </p>
        </div>

        {/* 0-700 Scaled Score Display */}
        <div className="py-2 bg-slate-900/80 rounded-2xl border border-slate-700/80 max-w-sm mx-auto p-4">
          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
            Estimated Scaled Score (0–700 Linear Approximation)
          </span>
          <div className="text-4xl font-black text-amber-400 tabular-nums mt-1">
            {scaledScore} <span className="text-sm font-semibold text-slate-400">/ 700</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Labeled: <span className="text-white font-semibold">Estimated</span> • Raw percentage: {percentage}% ({sessionSummary?.correct_count} / {sessionSummary?.total_questions} correct)
          </p>
        </div>

        {/* Evaluation Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-left">
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block text-[10px] uppercase">Subject Status</span>
            <p className={`font-bold text-sm mt-0.5 ${passedSubject ? 'text-emerald-400' : 'text-rose-400'}`}>
              {passedSubject ? 'Passed Subject' : 'Below 350 Benchmark'}
            </p>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block text-[10px] uppercase">Passage Accuracy</span>
            <p className="font-bold text-white text-sm mt-0.5">
              {evalResult?.passageAccuracy || 80}% Accuracy
            </p>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block text-[10px] uppercase">Time / Question</span>
            <p className="font-bold text-white text-sm mt-0.5">
              {evalResult?.timePerQ || 70}s avg
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            onClick={() => startExam(activeExamId)}
            className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake Paper</span>
          </button>
          <button
            onClick={() => setActiveExamId(null)}
            className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium text-xs rounded-xl transition-all cursor-pointer"
          >
            <span>Choose Another Subject / Year</span>
          </button>
        </div>
      </div>

      {/* Summary / Review toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowReview(false)}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
            !showReview
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            Score &amp; Prediction
          </span>
        </button>
        <button
          onClick={() => setShowReview(true)}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
            showReview
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" />
            Review Answers ({examDetail.questions.length})
          </span>
        </button>
      </div>

      {!showReview ? (
        <>
          {/* Aggregate Subject Breakdown (350/700 threshold per subject) */}
          {prediction && (
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  <span>National Exam Subject-Wise Performance & Pass Prediction</span>
                </h4>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    prediction.overall_predicted_status === 'PASS'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  Overall: {prediction.overall_predicted_status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Linear approximation scaled scores across national subjects against the 350/700 pass threshold. Stored in local table <code>eslce_predictions</code>.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {prediction.subject_breakdown.map(sub => (
                  <div
                    key={sub.subject_id}
                    className="p-3 bg-slate-900/70 border border-slate-700/60 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{sub.subject_name}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            sub.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {sub.passed ? 'Pass (≥350)' : 'Fail (<350)'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Accuracy: {sub.accuracy_percentage}% • {sub.time_per_question_sec}s/Q
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-amber-400">
                        {sub.estimated_scaled_score}
                      </span>
                      <span className="text-[10px] text-slate-400 block">/ 700 Est.</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Year-over-Year National Exam Score Trend */}
          {prediction?.year_over_year_trend && (
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Year-Over-Year National Trend</span>
              </h4>
              <p className="text-xs text-slate-400">
                Compare past exam sessions across consecutive Ethiopian calendar years.
              </p>

              <div className="grid grid-cols-3 gap-2 pt-1">
                {prediction.year_over_year_trend.map(t => (
                  <div
                    key={t.year}
                    className="p-3 bg-slate-900/70 border border-slate-700/60 rounded-xl text-center space-y-1"
                  >
                    <span className="text-[11px] font-bold text-slate-400">{t.year} E.C.</span>
                    <p className="text-base font-black text-amber-400">{t.estimated_scaled}</p>
                    <span className="text-[10px] text-slate-400 block">{t.percentage}% avg</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* ---------------------- REVIEW ANSWERS ---------------------- */
        <div className="space-y-4">
          {/* Latest prediction banner — the prediction engine is part of the review */}
          {prediction && (
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                prediction.overall_predicted_status === 'PASS'
                  ? 'bg-emerald-950/50 border-emerald-500/30'
                  : 'bg-rose-950/50 border-rose-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <BarChart3
                  className={`w-6 h-6 shrink-0 ${
                    prediction.overall_predicted_status === 'PASS' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                />
                <div>
                  <p className="text-xs font-bold text-white">
                    Latest Pass Prediction: {prediction.overall_predicted_status}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Avg scaled {prediction.average_scaled_score}/700 across {prediction.subject_breakdown.length} national subject{prediction.subject_breakdown.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <span className="text-lg font-black text-amber-400 tabular-nums">
                {prediction.total_estimated_score}
                <span className="text-[10px] text-slate-400 font-medium">/700</span>
              </span>
            </div>
          )}

          {/* Per-question review */}
          <div className="space-y-3">
            {examDetail.questions.map((qItem, idx) => {
              const chosen = selectedOptions[idx];
              const chosenOption = qItem.options.find(o => o.id === chosen);
              const isRight = chosenOption?.is_correct === 1;
              const isSkipped = chosen === undefined;

              return (
                <div
                  key={String(qItem.question.id)}
                  className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Question {idx + 1}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                        isSkipped
                          ? 'bg-slate-700/60 text-slate-300'
                          : isRight
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {isSkipped ? (
                        <AlertCircle className="w-3 h-3" />
                      ) : isRight ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {isSkipped ? 'Skipped' : isRight ? 'Correct' : 'Wrong'}
                    </span>
                  </div>

                  <div className="text-xs md:text-sm text-slate-200 leading-relaxed">
                    <RichText text={qItem.question.question_text} />
                  </div>

                  {qItem.passage && (
                    <p className="text-[10px] text-slate-500 italic">
                      Passage: {qItem.passage.title || qItem.passage.passage_code}
                    </p>
                  )}

                  <div className="space-y-1.5">
                    {qItem.options
                      .slice()
                      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                      .map(opt => {
                        const isChosen = opt.id === chosen;
                        const isCorrectOpt = opt.is_correct === 1;
                        let style = 'border-slate-800 bg-slate-900/60';
                        if (isCorrectOpt) style = 'border-emerald-500/60 bg-emerald-900/20';
                        else if (isChosen) style = 'border-rose-500/60 bg-rose-900/20';
                        return (
                          <div
                            key={opt.id}
                            className={`p-2.5 rounded-lg border text-xs flex items-start justify-between gap-2 ${style}`}
                          >
                            <span className="text-slate-300 leading-relaxed">
                              <span className="font-bold text-slate-400 mr-1.5">
                                {opt.label || String.fromCharCode(64 + qItem.options.indexOf(opt))}
                              </span>
                              <RichText text={opt.option_text} />
                            </span>
                            <span className="flex items-center gap-1 shrink-0">
                              {isCorrectOpt && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                              {isChosen && !isCorrectOpt && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                            </span>
                          </div>
                        );
                      })}
                  </div>

                  {qItem.question.explanation ? (
                    <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-xl text-xs leading-relaxed text-slate-300">
                      <span className="font-bold text-amber-400 block mb-1">Explanation</span>
                      <RichText text={qItem.question.explanation} />
                    </div>
                  ) : (
                    !isRight && !isSkipped && (
                      <p className="text-[10px] text-slate-500 italic">
                        No explanation is stored for this question in the bank.
                      </p>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
