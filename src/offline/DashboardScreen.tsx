/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { sqliteDb } from './db';
import type { QuestionHistoryItem, SubjectMasteryItem } from './types';
import confetti from './confetti';
import { MasteryChart } from './MasteryChart';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  Award,
  BarChart3,
  ArrowRight,
  School,
  BrainCircuit,
  CheckCircle2,
  FileText,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  AlertTriangle,
  Target,
  GraduationCap,
  ClipboardCheck,
  Printer,
  X,
  Copy
} from 'lucide-react';

interface Props {
  onNavigateTab: (tab: 'study' | 'quiz' | 'exam' | 'eslce' | 'settings') => void;
  onOpenTextbook: (stbId: string) => void;
  onLaunchQuiz?: (stbId: string, chapterId: number, sectionId: string) => void;
}

export const DashboardScreen: React.FC<Props> = ({
  onNavigateTab,
  onOpenTextbook,
  onLaunchQuiz
}) => {
  const [analytics, setAnalytics] = useState(sqliteDb.getDashboardAnalytics());
  const [stats, setStats] = useState(sqliteDb.getDashboardStats());
  const [user, setUser] = useState(sqliteDb.getLocalUser());
  const [textbooks, setTextbooks] = useState(sqliteDb.getTextbooks());
  const [recentQuizzes, setRecentQuizzes] = useState(sqliteDb.getQuizSessions().slice(0, 3));
  const [recentExams, setRecentExams] = useState(sqliteDb.getExamSessions().slice(0, 3));
  const [recentEslce, setRecentEslce] = useState(sqliteDb.getEslceSessions().slice(0, 3));
  const [missedQuestions, setMissedQuestions] = useState<QuestionHistoryItem[]>(sqliteDb.getMissedQuestions(4));
  const [mastery, setMastery] = useState<SubjectMasteryItem[]>(sqliteDb.getSubjectMasteryBreakdown());
  const [showReportCardModal, setShowReportCardModal] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);

  const refreshData = () => {
    setAnalytics(sqliteDb.getDashboardAnalytics());
    setStats(sqliteDb.getDashboardStats());
    setUser(sqliteDb.getLocalUser());
    setTextbooks(sqliteDb.getTextbooks());
    setRecentQuizzes(sqliteDb.getQuizSessions().slice(0, 3));
    setRecentExams(sqliteDb.getExamSessions().slice(0, 3));
    setRecentEslce(sqliteDb.getEslceSessions().slice(0, 3));
    setMissedQuestions(sqliteDb.getMissedQuestions(4));
    setMastery(sqliteDb.getSubjectMasteryBreakdown());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const isGrade12 = analytics.gradeCode === 'G12';

  const recommendedAction = analytics.recommendedAction;

  const handleCopyReport = () => {
    const reportText = `MENEN STUDENT ASSISTANT - ACADEMIC EVALUATION REPORT
Student: ${user?.display_name || 'Student'}
Grade: ${stats.gradeLabel} (Ethiopian Curriculum)
Overall Cumulative Mastery: ${analytics.overallAverage}%
National Percentile Rank: Top ${100 - analytics.gradeLevelPercentile}% (${analytics.gradeLevelPercentile}th Percentile)
Total Assessments Completed: ${analytics.totalAssessments}
Textbook Modules Completed: ${analytics.textbookCompletionPercentage}%
Strongest Area: ${analytics.strongestSubject}
Focus / Revision Needed: ${analytics.weakestSubject}
Generated Offline by SQLite Local Evaluation Engine`;

    navigator.clipboard.writeText(reportText);
    setReportCopied(true);
    setTimeout(() => setReportCopied(false), 2500);

    try {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-4 pb-8">
      {/* 1. Welcome Greeting Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900/80 via-slate-800 to-slate-900 border border-emerald-500/30 p-4 sm:p-5 shadow-lg">
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
              {stats.gradeLabel} • Ethiopian Curriculum
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Offline Evaluation Engine Active</span>
            </div>
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight mb-1">
            Selam, {user?.display_name || 'Student'}! 👋
          </h2>
          <p className="text-xs md:text-sm text-slate-300 max-w-lg mb-3 leading-relaxed">
            {isGrade12
              ? 'All quizzes, exams, and ESLCE evaluation analytics are computed locally in your offline SQLite database with continuous mastery tracking.'
              : 'All quizzes, exams, and evaluation analytics are computed locally in your offline SQLite database with continuous mastery tracking.'}
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => onNavigateTab('study')}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Textbook Reader</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigateTab('quiz')}
              className="px-3.5 py-1.5 bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700 font-medium text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Practice Quizzes</span>
              <BrainCircuit className="w-3.5 h-3.5 text-emerald-400" />
            </button>
            <button
              onClick={() => onNavigateTab('exam')}
              className="px-3.5 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 font-medium text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Chapter Exams</span>
              <FileText className="w-3.5 h-3.5" />
            </button>
            {isGrade12 && (
              <button
                onClick={() => onNavigateTab('eslce')}
                className="px-3.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-medium text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>ESLCE Bank</span>
                <School className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setShowReportCardModal(true)}
              className="px-3.5 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Academic Report</span>
            </button>
          </div>
        </div>

        {/* Decorative corner icon */}
        <div className="absolute right-3 -bottom-4 text-emerald-500/10 pointer-events-none">
          <BookOpen className="w-36 h-36" />
        </div>
      </div>

      {/* 2. RECOMMENDED NEXT ACTION CARD */}
      {recommendedAction && (
        <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                Recommended Next Step
              </span>
              <span className="text-[11px] text-slate-400">Diagnostic Guidance</span>
            </div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              {recommendedAction.title}
            </h3>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              {recommendedAction.subtitle}
            </p>
          </div>

          <button
            onClick={() => {
              if (onLaunchQuiz) {
                onLaunchQuiz(
                  recommendedAction.stbId,
                  recommendedAction.chapterId,
                  recommendedAction.sectionId
                );
              } else {
                onNavigateTab('quiz');
              }
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>{recommendedAction.actionText}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. WEAK SECTIONS SURFACED ON DASHBOARD (< 60% AVERAGE SCORE) */}
      {analytics.weakSections.length > 0 && (
        <div className="bg-slate-800/80 border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                Weak Sections Identified (&lt;60% Mastery)
              </h3>
            </div>
            <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
              {analytics.weakSections.length} Sections Needing Revision
            </span>
          </div>
          <p className="text-xs text-slate-400">
            The evaluation engine tracks your quiz and exam history. The following sections scored below 60% and require immediate study:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {analytics.weakSections.map(ws => (
              <div
                key={ws.section_id}
                className="p-3 bg-slate-900/80 border border-slate-700/80 rounded-xl flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-white">{ws.section_title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({ws.section_id})</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span>Average score: <span className="text-amber-400 font-bold">{ws.average_score}%</span></span>
                    <span>•</span>
                    <span>{ws.attempts} attempt(s)</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (onLaunchQuiz) {
                      onLaunchQuiz(ws.stb_id, ws.chapter_id, ws.section_id);
                    } else {
                      onNavigateTab('quiz');
                    }
                  }}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg font-medium text-[11px] transition-all cursor-pointer shrink-0"
                >
                  Retake Quiz
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. AGGREGATED EVALUATION ANALYTICS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Overall Average */}
        <div className="bg-slate-800/80 border border-slate-700/70 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide uppercase">Overall Average</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-bold text-white tabular-nums">
              {analytics.overallAverage}%
            </div>
            <p className="text-[11px] text-emerald-400 mt-0.5">Capped at 100%</p>
          </div>
        </div>

        {/* Weakest Subject */}
        <div className="bg-slate-800/80 border border-slate-700/70 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide uppercase">Weakest Area</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xs md:text-sm font-bold text-rose-300 line-clamp-1">
              {analytics.weakestSubject}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Focus for revision</p>
          </div>
        </div>

        {/* Strongest Subject */}
        <div className="bg-slate-800/80 border border-slate-700/70 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide uppercase">Strongest Area</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xs md:text-sm font-bold text-emerald-300 line-clamp-1">
              {analytics.strongestSubject}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">High mastery</p>
          </div>
        </div>

        {/* Grade-Level Percentile */}
        <div className="bg-slate-800/80 border border-slate-700/70 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium tracking-wide uppercase">Local Percentile</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-bold text-white tabular-nums">
              {analytics.gradeLevelPercentile}th
            </div>
            <p className="text-[11px] text-indigo-300 mt-0.5">{stats.gradeLabel} benchmark</p>
          </div>
        </div>
      </div>

      {/* 5. ESLCE PREDICTION WIDGET (GRADE 12 ONLY) */}
      {isGrade12 && analytics.eslcePrediction && (
        <div className="bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <School className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                National Exam (ESLCE) Pass Prediction Engine
              </h3>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                analytics.eslcePrediction.overall_predicted_status === 'PASS'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              Prediction: {analytics.eslcePrediction.overall_predicted_status} (≥350/700 Standard)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 bg-slate-900/80 border border-slate-700/80 rounded-xl">
              <span className="text-[10px] uppercase text-slate-400 block">Total Estimated Scaled Score</span>
              <p className="text-2xl font-black text-amber-400 tabular-nums mt-0.5">
                {analytics.eslcePrediction.average_scaled_score} <span className="text-xs text-slate-400 font-normal">/ 700 Est.</span>
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Linear approximation formula</span>
            </div>

            <div className="p-3 bg-slate-900/80 border border-slate-700/80 rounded-xl">
              <span className="text-[10px] uppercase text-slate-400 block">Year-Over-Year Trend</span>
              <div className="flex items-center gap-3 mt-1 text-xs">
                {analytics.eslcePrediction.year_over_year_trend.map(t => (
                  <div key={t.year} className="text-center">
                    <span className="text-[10px] text-slate-400 block">{t.year}</span>
                    <span className="font-bold text-amber-300">{t.estimated_scaled}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-900/80 border border-slate-700/80 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">National Papers Taken</span>
                <p className="text-lg font-bold text-white mt-0.5">
                  {sqliteDb.getEslceSessions().length} Practice Papers
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('eslce')}
                className="mt-2 text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                <span>Take National Paper</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. RECENT EVALUATIONS & SCORECARDS LOG */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Recent Assessment Activity & Scores
            </h3>
          </div>
          <button
            onClick={() => setShowReportCardModal(true)}
            className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>View Full Report</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentQuizzes.length === 0 && recentExams.length === 0 && recentEslce.length === 0 ? (
          <div className="text-center py-6 px-4 bg-slate-900/60 rounded-xl border border-dashed border-slate-700">
            <BarChart3 className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-300">No evaluations completed yet</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
              Start by taking a section practice quiz or a chapter unit exam. Scores and diagnostic breakdown will appear here automatically.
            </p>
            <div className="flex justify-center gap-2 mt-3">
              <button
                onClick={() => onNavigateTab('quiz')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl cursor-pointer"
              >
                Start Practice Quiz
              </button>
              <button
                onClick={() => onNavigateTab('exam')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs rounded-xl cursor-pointer"
              >
                Take Chapter Exam
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {/* Recent Quizzes */}
            <div className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                <span className="flex items-center gap-1">
                  <BrainCircuit className="w-3 h-3 text-emerald-400" />
                  <span>Section Quizzes</span>
                </span>
                <span className="text-emerald-400 font-mono">{recentQuizzes.length} recent</span>
              </div>
              {recentQuizzes.length === 0 ? (
                <p className="text-[11px] text-slate-500 py-2">No section quizzes taken</p>
              ) : (
                recentQuizzes.slice(0, 2).map((q, idx) => {
                  const correctCount = Math.round(((q.overall_score || 0) / 100) * q.total_questions);
                  return (
                    <div key={idx} className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-white truncate max-w-[140px]">
                          {q.section_id || `Section Quiz`}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {correctCount}/{q.total_questions} questions ({q.overall_score}%)
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          (q.overall_score || 0) >= 60
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {q.overall_score}%
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Recent Unit Exams */}
            <div className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3 text-indigo-400" />
                  <span>Chapter Exams</span>
                </span>
                <span className="text-indigo-400 font-mono">{recentExams.length} recent</span>
              </div>
              {recentExams.length === 0 ? (
                <p className="text-[11px] text-slate-500 py-2">No unit exams attempted</p>
              ) : (
                recentExams.slice(0, 2).map((e, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-white truncate max-w-[140px]">
                        Chapter {e.chapter_id} Exam
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {e.session_type === 'formal_timed' ? 'Timed 20m' : 'Practice'} • {e.overall_score !== undefined && e.overall_score >= 50 ? 'PASSED' : 'REVISION'}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        (e.overall_score || 0) >= 50
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {e.overall_score}%
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* National Exam (Grade 12) or Overall Diagnostic */}
            <div className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                <span className="flex items-center gap-1">
                  <School className="w-3 h-3 text-amber-400" />
                  <span>National Assessment</span>
                </span>
                <span className="text-amber-400 font-mono">
                  {isGrade12 ? 'ESLCE 700 Scale' : 'National Standard'}
                </span>
              </div>
              {isGrade12 ? (
                recentEslce.length === 0 ? (
                  <div className="p-2 rounded-lg bg-slate-800/50 text-[11px] text-slate-400">
                    <p>No ESLCE papers attempted.</p>
                    <button
                      onClick={() => onNavigateTab('eslce')}
                      className="text-amber-400 font-semibold mt-1 hover:underline text-[10px] block"
                    >
                      Take 2014-2016 E.C. Paper →
                    </button>
                  </div>
                ) : (
                  recentEslce.slice(0, 2).map((s, idx) => {
                    const scaled = s.percentage !== undefined ? Math.round((s.percentage / 100) * 700) : 0;
                    return (
                      <div key={idx} className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-white truncate max-w-[130px]">
                            {s.subject_name || 'ESLCE'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {s.source_year ? `${s.source_year} E.C.` : 'National'} • {scaled >= 350 ? 'PASSED' : 'NEEDS REVISION'}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                          {scaled}/700
                        </span>
                      </div>
                    );
                  })
                )
              ) : (
                <div className="p-2 rounded-lg bg-slate-800/60 text-[11px] text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span>Curriculum Level:</span>
                    <span className="text-emerald-400 font-semibold">{stats.gradeLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Percentile Rank:</span>
                    <span className="text-sky-300 font-semibold">Top {100 - analytics.gradeLevelPercentile}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 7. MISSED QUESTIONS DIAGNOSTIC & REMEDIATION HUB */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Diagnostic Remediation: Questions Flagged for Review
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {missedQuestions.length} flagged in SQLite
          </span>
        </div>

        {missedQuestions.length === 0 ? (
          <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">
                Flawless Accuracy — No Missed Questions Tracked!
              </h4>
              <p className="text-[11px] text-emerald-300/80 mt-0.5">
                Every question you answered was correct, or you have not taken an assessment yet. Any missed questions will be captured here for targeted spaced revision.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-xs text-slate-300">
              Review questions answered incorrectly in previous assessments to strengthen theoretical understanding before examinations:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {missedQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-900/90 border border-slate-700/80 rounded-xl space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {q.subject_name || 'Subject Review'}
                      </span>
                      <span className="text-[10px] text-amber-400 font-semibold uppercase">
                        {q.assessment_type.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-white line-clamp-2">
                      {q.question_text}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 text-[11px] space-y-1">
                    <div className="flex items-baseline gap-1.5 text-rose-300">
                      <span className="font-semibold text-rose-400 shrink-0">Your answer:</span>
                      <span className="line-clamp-1">{q.selected_answer}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 text-emerald-300 font-medium">
                      <span className="font-semibold text-emerald-400 shrink-0">Correct:</span>
                      <span className="line-clamp-1">{q.correct_answer}</span>
                    </div>
                    {q.explanation && (
                      <p className="text-[10px] text-slate-400 italic bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/80 mt-1 line-clamp-2">
                        {q.explanation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 7. STUDY PROGRESS & TEXTBOOK COMPLETION PERCENTAGE */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Study Evaluation & Textbook Completion
            </h3>
          </div>
          <span className="text-xs font-bold text-emerald-400">
            {analytics.textbookCompletionPercentage}% Completed
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
            style={{ width: `${analytics.textbookCompletionPercentage}%` }}
          />
        </div>

        {/* Study Metrics Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-700/50">
            <span className="text-[10px] text-slate-400 block uppercase">Sections Completed</span>
            <p className="font-bold text-white text-sm mt-0.5">
              {analytics.studyEval.completedSections} / {analytics.studyEval.totalSections}
            </p>
          </div>

          <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-700/50">
            <span className="text-[10px] text-slate-400 block uppercase">Re-Reads Count</span>
            <p className="font-bold text-indigo-300 text-sm mt-0.5">
              {analytics.studyEval.totalReReads} reviews
            </p>
          </div>

          <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-700/50">
            <span className="text-[10px] text-slate-400 block uppercase">Saved Highlights</span>
            <p className="font-bold text-amber-300 text-sm mt-0.5">
              {analytics.studyEval.totalHighlights} highlights
            </p>
          </div>

          <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-700/50">
            <span className="text-[10px] text-slate-400 block uppercase">Bookmarks & Notes</span>
            <p className="font-bold text-emerald-300 text-sm mt-0.5">
              {analytics.studyEval.totalBookmarks + analytics.studyEval.totalNotes} items
            </p>
          </div>
        </div>
      </div>

      {/* 7b. SUBJECT MASTERY BREAKDOWN (bars vs 50% pass line) */}
      <MasteryChart items={mastery} />

      {/* 8. Textbooks List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white tracking-tight">
              {stats.gradeLabel} Textbooks ({textbooks.length})
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab('study')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {textbooks.map((book) => (
            <div
              key={book.stb_id}
              onClick={() => {
                onOpenTextbook(book.stb_id);
                onNavigateTab('study');
              }}
              className="group bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 hover:border-emerald-500/40 rounded-xl p-3.5 transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-emerald-400 font-bold text-sm shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                  {book.subject_id.replace('SUB_', '').slice(0, 2)}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                    {book.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span>{book.chapter_count} Chapters</span>
                    <span>·</span>
                    <span>{book.section_count} Sections</span>
                  </div>
                </div>
              </div>

              <div className="p-1 rounded-lg text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 9. ACADEMIC EVALUATION REPORT CARD MODAL */}
      {showReportCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4 shadow-2xl scrollbar-thin scrollbar-thumb-slate-700">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Academic Evaluation Report Card
                  </h3>
                  <p className="text-[11px] text-emerald-400 font-medium">
                    Ethiopian High School Curriculum Standard
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowReportCardModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Student & Profile Box */}
            <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Student Name</span>
                <span className="font-bold text-white text-sm">{user?.display_name || 'Enrolled Student'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Curriculum Grade</span>
                <span className="font-bold text-emerald-400">{stats.gradeLabel}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Offline Database</span>
                <span className="font-mono text-[11px] text-slate-300">SQLite (Room WAL)</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Evaluated On</span>
                <span className="text-[11px] text-slate-300">{new Date().toLocaleDateString()}</span>
              </div>
            </div>

            {/* Core Evaluation Scores */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-center">
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Cumulative</span>
                <p className="text-xl font-black text-emerald-400 mt-0.5">{analytics.overallAverage}%</p>
                <span className="text-[9px] text-slate-400">Mastery Index</span>
              </div>
              <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-center">
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Rank</span>
                <p className="text-xl font-black text-sky-400 mt-0.5">Top {100 - analytics.gradeLevelPercentile}%</p>
                <span className="text-[9px] text-slate-400">{analytics.gradeLevelPercentile}th Percentile</span>
              </div>
              <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-center">
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Assessments</span>
                <p className="text-xl font-black text-white mt-0.5">{analytics.totalAssessments}</p>
                <span className="text-[9px] text-slate-400">Taken</span>
              </div>
              <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-center">
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Textbooks</span>
                <p className="text-xl font-black text-amber-400 mt-0.5">{analytics.textbookCompletionPercentage}%</p>
                <span className="text-[9px] text-slate-400">Read</span>
              </div>
            </div>

            {/* Grade 12 National ESLCE Projection (real, only after real national sessions) */}
            {isGrade12 &&
              (analytics.eslcePrediction ? (
                <div className="p-3.5 bg-gradient-to-r from-amber-950/30 to-slate-900 border border-amber-500/30 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                      <School className="w-4 h-4" />
                      <span>ESLCE Scaled Score Projection (Grade 12)</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                      Linear Scaled (0-700)
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <span className="text-2xl font-black text-white">{analytics.eslcePrediction.total_estimated_score}</span>
                      <span className="text-slate-400 text-xs font-semibold"> / 700 Points</span>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${
                        analytics.eslcePrediction.overall_predicted_status === 'PASS'
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                          : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                      }`}
                    >
                      {analytics.eslcePrediction.overall_predicted_status === 'PASS'
                        ? 'PASSED FOR UNIVERSITY'
                        : 'UNIVERSITY ENTRANCE AT RISK'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Computed from your {analytics.eslcePrediction.subject_breakdown.length} national subject
                    attempt(s) via linear scaling. National pass threshold is 350 / 700. No guessed scores are shown.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-slate-950/60 border border-slate-700/80 rounded-2xl flex items-start gap-2.5">
                  <School className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white text-[11px]">No ESLCE Projection Yet</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Take at least one national ESLCE practice session to unlock a real scaled-score prediction
                      (0-700) based on your live performance. The app never fabricates projection scores.
                    </p>
                  </div>
                </div>
              ))}

            {/* Strengths & Diagnostic Focus */}
            <div className="space-y-2 pt-1 text-xs">
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/80 flex items-start gap-2.5">
                <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-[11px]">Strongest Performance Area</h4>
                  <p className="text-slate-300 text-[11px] mt-0.5">{analytics.strongestSubject}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/80 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-[11px]">Recommended Remediation Focus</h4>
                  <p className="text-slate-300 text-[11px] mt-0.5">{analytics.weakestSubject}</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={handleCopyReport}
                className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {reportCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                <span>{reportCopied ? 'Report Copied!' : 'Copy Summary'}</span>
              </button>

              <button
                onClick={handlePrintReport}
                className="flex-1 py-2 px-3 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-sky-400" />
                <span>Print / PDF</span>
              </button>

              <button
                onClick={() => setShowReportCardModal(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print-optimized report card (portaled to body, shown only when modal is open) */}
      {showReportCardModal &&
        createPortal(
          <div id="printReportCard">
            <div className="print-header">
              <h1>MENEN STUDENT ASSISTANT</h1>
              <p>Academic Evaluation Report Card</p>
              <p>Ethiopian High School Curriculum Standard</p>
            </div>
            <div className="print-meta">
              <p><strong>Student:</strong> {user?.display_name || 'Enrolled Student'}</p>
              <p><strong>Grade:</strong> {stats.gradeLabel}</p>
              <p><strong>Generated:</strong> {new Date().toLocaleString()}</p>
            </div>
            <h2>Subject Mastery Breakdown</h2>
            <table className="print-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Average Score</th>
                  <th>Assessments</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {mastery.filter(m => m.assessments_count > 0).map(m => (
                  <tr key={m.subject_id}>
                    <td>{m.subject_name}</td>
                    <td>{m.average_score}%</td>
                    <td>{m.assessments_count}</td>
                    <td>{m.pass_status === 'PASS' ? 'PASS' : 'NEEDS REVISION'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="print-scores">
              <div><strong>Overall Cumulative Mastery:</strong> {analytics.overallAverage}%</div>
              <div><strong>National Percentile Rank:</strong> Top {100 - analytics.gradeLevelPercentile}%</div>
              <div><strong>Total Assessments Taken:</strong> {analytics.totalAssessments}</div>
              <div><strong>Textbook Completion:</strong> {analytics.textbookCompletionPercentage}%</div>
            </div>
            {isGrade12 && analytics.eslcePrediction && (
              <div className="print-eslce">
                <strong>ESLCE Scaled Score Projection:</strong> {analytics.eslcePrediction.total_estimated_score} / 700 (
                {analytics.eslcePrediction.overall_predicted_status === 'PASS'
                  ? 'PASSED FOR UNIVERSITY'
                  : 'UNIVERSITY ENTRANCE AT RISK'}
                )
              </div>
            )}
            <p className="print-footer">
              Generated offline by the Menen Student Assistant SQLite Evaluation Engine.
            </p>
          </div>,
          document.body
        )}

      <style>
        {`
          #printReportCard { display: none; }
          @media print {
            body * { visibility: hidden !important; }
            #printReportCard, #printReportCard * { visibility: visible !important; }
            #printReportCard {
              display: block !important;
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 24px;
              background: #ffffff;
              color: #111827;
              font-family: Inter, system-ui, Arial, sans-serif;
              font-size: 13px;
              line-height: 1.5;
            }
            #printReportCard h1 { font-size: 18px; margin: 0 0 2px; color: #065f46; }
            #printReportCard .print-header { border-bottom: 2px solid #065f46; padding-bottom: 8px; margin-bottom: 12px; }
            #printReportCard .print-header p { margin: 2px 0; color: #374151; }
            #printReportCard .print-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; margin-bottom: 12px; }
            #printReportCard .print-meta p { margin: 0; }
            #printReportCard h2 { font-size: 14px; margin: 12px 0 6px; color: #065f46; }
            #printReportCard table.print-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            #printReportCard .print-table th, #printReportCard .print-table td { border: 1px solid #9ca3af; padding: 5px 8px; text-align: left; font-size: 12px; }
            #printReportCard .print-table th { background: #d1fae5; color: #111827; }
            #printReportCard .print-scores { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; margin-bottom: 10px; }
            #printReportCard .print-scores div { margin: 0; }
            #printReportCard .print-eslce { padding: 8px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; font-weight: 600; }
            #printReportCard .print-footer { margin-top: 14px; font-size: 10px; color: #6b7280; border-top: 1px solid #9ca3af; padding-top: 6px; }
          }
        `}
      </style>
    </div>
  );
};
