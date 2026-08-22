import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvaluation, type LetterGrade } from '../context/EvaluationContext';
import {
  LayoutDashboard, BookOpen, ClipboardCheck, GraduationCap, Award, Brain, Activity, Lightbulb,
  ArrowLeft, Printer, Clock, Target, BarChart3, TrendingUp, Gauge, Battery,
  CheckCircle, AlertTriangle, AlertCircle, Flame, ChevronDown, ChevronRight,
  Zap, Shield, BookCheck, Timer, Trophy, Star, Hash, FileText
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, BookOpen, ClipboardCheck, GraduationCap, Award, Brain, Activity, Lightbulb,
  Target, Battery, Clock, BarChart3, TrendingUp, Gauge, Flame, Zap, Shield, BookCheck,
  Timer, Trophy, Star, Hash
};

const colorMap: Record<string, string> = {
  emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
  green: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
  blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
  indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800',
  purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800',
  orange: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800',
  rose: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800',
  red: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
  amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
  slate: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
};

const badgeColor: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

interface ReportData {
  student: { studentId: string; fullName: string; gradeLevel: string; gender: string; subscriptionStatus: string };
  reportGeneratedAt: string;
  study: {
    totalSessions: number; totalSectionsStudied: number; totalSectionsCompleted: number;
    totalStudyHours: number; totalStudyMinutes: number; textbookCount: number; textbooksStudied: string[];
    averageSessionMinutes: number; completionRate: number; description: string;
    recentSessions: Array<{ textbookId: string; chapterId: number; startedAt: string; endedAt: string; pagesCovered: string }>;
  };
  quizzes: {
    totalSessions: number; averageScore: number; bestScore: number; worstScore: number;
    averageLetterGrade: LetterGrade | null; gradeDistribution: Record<string, number>;
    totalQuestionsAnswered: number; totalTimeSpentMinutes: number; averageTimePerQuestion: number;
    byTextbook: Array<{ textbookId: string; attempts: number; averageScore: number; bestScore: number; letterGrade: LetterGrade | null }>;
    recentSessions: Array<{
      sessionId: string; textbookId: string; sectionId: string; score: number;
      totalQuestions: number; attemptNumber: number; completedAt: string; letterGrade: LetterGrade | null;
    }>;
    description: string;
  };
  exams: {
    totalSessions: number; averageScore: number; bestScore: number;
    averageLetterGrade: LetterGrade | null; gradeDistribution: Record<string, number>;
    recentSessions: Array<{
      sessionId: string; textbookId: string; sectionId: string; score: number;
      correctAnswers: number; wrongAnswers: number; totalQuestions: number;
      attemptNumber: number; completedAt: string; letterGrade: LetterGrade | null;
    }>;
    description: string;
  };
  eslce: {
    totalSessions: number; averageScore: number; bestScore: number;
    passCount: number; failCount: number; passRate: number; passThreshold: number;
    bySubject: Array<{ subject: string; sessions: number; averageScore: number; bestScore: number; letterGrade: LetterGrade | null; passed: boolean }>;
    recentSessions: Array<{
      sessionId: number; subject: string; examType: string; mode: string;
      percentage: number; correctCount: number; wrongCount: number;
      unansweredCount: number; completedAt: string; letterGrade: LetterGrade | null;
    }>;
    description: string;
  } | null;
  mastery: {
    overallMastery: number; overallLetterGrade: LetterGrade;
    subjects: Array<{
      textbookId: string; currentScore: number; baselineScore: number; growthDelta: number;
      strengthArea: string; weaknessArea: string; masteryStatus: string;
      questionsAttempted: number; correctAnswers: number; accuracy: number;
      growthIndex: number; letterGrade: LetterGrade;
    }>;
    strongestSubject: any; weakestSubject: any;
    totalQuestionsAttempted: number; totalCorrectAnswers: number; description: string;
  };
  metrics: {
    accuracy: { value: number; label: { label: string; color: string } };
    consistency: { value: number; label: { label: string; color: string } };
    responseTime: { value: number; label: { label: string; color: string } };
    completion: { value: number; label: { label: string; color: string } };
    mastery: { value: number; label: { label: string; color: string } };
    improvement: { value: number; label: { label: string; color: string } };
    risk: { value: number; label: { label: string; color: string } };
    velocity: string; stability: string; status: string; description: string;
  };
  recommendations: Array<{ priority: string; area: string; message: string; actions: string[] }>;
  overallGrade: LetterGrade;
}

export default function StudentReportPage() {
  const navigate = useNavigate();
  const evalCtx = useEvaluation();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { setError('Not authenticated'); setLoading(false); return; }
        const res = await fetch(`${API_BASE}/api/evaluation/report`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`Report API: ${res.status}`);
        const data = await res.json();
        setReport(data);
      } catch (e: any) {
        setError(e.message || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">Generating your comprehensive report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-xl mx-auto mt-12 text-center">
        <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
        <p className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Could not load report</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{error || 'No data available'}</p>
        <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm">Back to Dashboard</button>
      </div>
    );
  }

  const { student, study, quizzes, exams, eslce, mastery, metrics, recommendations, overallGrade } = report;

  return (
    <div className="max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-sm">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/report-detailed')} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-sm">
            <FileText className="h-4 w-4" /> Detailed Report
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-sm">
            <Printer className="h-4 w-4" /> Print Report
          </button>
        </div>
      </div>

      {/* Report Header Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">Comprehensive Student Report</p>
            <h1 className="text-3xl font-bold mb-1">{student.fullName}</h1>
            <p className="text-indigo-200 text-sm">Grade {student.gradeLevel} &middot; {student.studentId}</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 rounded-2xl px-6 py-4 text-center">
              <p className="text-4xl font-black">{overallGrade.grade}</p>
              <p className="text-indigo-200 text-xs mt-1">Overall Grade</p>
            </div>
            <div className="bg-white/10 rounded-2xl px-6 py-4 text-center">
              <p className="text-4xl font-black">{metrics.risk.value}%</p>
              <p className="text-indigo-200 text-xs mt-1">Risk Score</p>
            </div>
          </div>
        </div>
        <p className="text-indigo-200 text-xs mt-4">Report generated: {new Date(report.reportGeneratedAt).toLocaleString()}</p>
      </div>

      {/* Report Sections */}
      <div className="space-y-4">
        {/* ═══ OVERVIEW ═══ */}
        <ReportSection title="Overall Performance Summary" icon="LayoutDashboard" expanded={expandedSections.has('overview')} onToggle={() => toggleSection('overview')}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Overall Grade" value={overallGrade.grade} color={overallGrade.color} />
            <StatCard label="Study Hours" value={`${study.totalStudyHours}h`} color="blue" />
            <StatCard label="Quizzes Done" value={quizzes.totalSessions} color="indigo" />
            <StatCard label="Risk Status" value={metrics.status === 'OnTrack' ? 'On Track' : metrics.status === 'AtRisk' ? 'At Risk' : 'High Risk'} color={metrics.status === 'OnTrack' ? 'emerald' : metrics.status === 'AtRisk' ? 'amber' : 'rose'} />
          </div>
          <div className="bg-slate-50 dark:bg-gray-800 rounded-2xl p-5 border border-slate-200 dark:border-gray-700">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{metrics.description}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <InfoCard icon="Zap" title="Velocity" value={metrics.velocity} description="How your scores are trending over time" />
            <InfoCard icon="Shield" title="Stability" value={metrics.stability} description="How consistent your performance is across sessions" />
            <InfoCard icon="Target" title="Accuracy" value={`${metrics.accuracy.value}%`} description={`${metrics.accuracy.label.label} — ${evalCtx.getMetricDef('accuracy')?.interpretation?.high ? 'see metrics section for details' : ''}`} />
          </div>
        </ReportSection>

        {/* ═══ STUDY ═══ */}
        <ReportSection title="Study Activity" icon="BookOpen" expanded={expandedSections.has('study')} onToggle={() => toggleSection('study')}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Study Sessions" value={study.totalSessions} color="blue" />
            <StatCard label="Sections Completed" value={`${study.totalSectionsCompleted}/${study.totalSectionsStudied}`} color="emerald" />
            <StatCard label="Textbooks Used" value={study.textbookCount} color="indigo" />
            <StatCard label="Avg Session" value={`${study.averageSessionMinutes}m`} color="purple" />
          </div>
          <div className="bg-slate-50 dark:bg-gray-800 rounded-2xl p-5 border border-slate-200 dark:border-gray-700 mb-4">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">Summary</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{study.description}</p>
          </div>
          <div className="bg-slate-50 dark:bg-gray-800 rounded-2xl p-5 border border-slate-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">Section Completion</p>
            <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-3 mb-2">
              <div className="bg-indigo-600 h-3 rounded-full transition-all" style={{ width: `${study.completionRate}%` }} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{study.completionRate}% completed ({study.totalSectionsCompleted} of {study.totalSectionsStudied} sections)</p>
          </div>
        </ReportSection>

        {/* ═══ QUIZZES ═══ */}
        <ReportSection title="Quiz Performance" icon="ClipboardCheck" expanded={expandedSections.has('quizzes')} onToggle={() => toggleSection('quizzes')}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Quizzes" value={quizzes.totalSessions} color="indigo" />
            <StatCard label="Average Score" value={`${quizzes.averageScore}%`} color={evalCtx.getScoreLabel(quizzes.averageScore).color} />
            <StatCard label="Best Score" value={`${quizzes.bestScore}%`} color="emerald" />
            <StatCard label="Questions Answered" value={quizzes.totalQuestionsAnswered} color="blue" />
          </div>
          {quizzes.averageLetterGrade && (
            <div className="flex items-center gap-4 mb-6 bg-slate-50 dark:bg-gray-800 rounded-2xl p-5 border border-slate-200 dark:border-gray-700">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black ${badgeColor[quizzes.averageLetterGrade.color] || badgeColor.slate}`}>
                {quizzes.averageLetterGrade.grade}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Quiz Letter Grade: {quizzes.averageLetterGrade.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Based on your average score of {quizzes.averageScore}% across {quizzes.totalSessions} quizzes</p>
              </div>
            </div>
          )}
          {Object.keys(quizzes.gradeDistribution).length > 0 && (
            <div className="bg-slate-50 dark:bg-gray-800 rounded-2xl p-5 border border-slate-200 dark:border-gray-700 mb-4">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">Grade Distribution</p>
              <div className="flex gap-3 flex-wrap">
                {Object.entries(quizzes.gradeDistribution).sort().map(([grade, count]) => {
                  const lg = evalCtx.getLetterGrade(0);
                  const g = report.quizzes.recentSessions.find(s => s.letterGrade?.grade === grade)?.letterGrade || lg;
                  return (
                    <div key={grade} className={`px-4 py-2 rounded-xl text-sm font-bold ${badgeColor[g?.color || 'slate']}`}>
                      {grade}: {count}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {quizzes.byTextbook.length > 0 && (
            <div className="bg-slate-50 dark:bg-gray-800 rounded-2xl p-5 border border-slate-200 dark:border-gray-700 mb-4">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">By Textbook</p>
              <div className="space-y-2">
                {quizzes.byTextbook.map(tb => (
                  <div key={tb.textbookId} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-xl border border-slate-100 dark:border-gray-800">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{tb.textbookId}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">{tb.attempts} attempts</span>
                      <span className={`text-sm font-bold ${badgeColor[tb.letterGrade?.color || 'slate']}`}>{tb.averageScore}%</span>
                      {tb.letterGrade && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColor[tb.letterGrade.color]}`}>{tb.letterGrade.grade}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-slate-50 dark:bg-gray-800 rounded-2xl p-5 border border-slate-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">Recent Quizzes</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-200 dark:border-gray-700">
                    <th className="pb-2 font-semibold">Section</th>
                    <th className="pb-2 font-semibold">Score</th>
                    <th className="pb-2 font-semibold">Grade</th>
                    <th className="pb-2 font-semibold">Questions</th>
                    <th className="pb-2 font-semibold">Attempt</th>
                    <th className="pb-2 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {quizzes.recentSessions.map(q => (
                    <tr key={q.sessionId} className="border-b border-slate-100 dark:border-gray-800 last:border-0">
                      <td className="py-2.5 text-slate-700 dark:text-slate-300 font-medium">{q.textbookId} / {q.sectionId}</td>
                      <td className="py-2.5"><span className={`font-bold ${q.score >= 70 ? 'text-emerald-600 dark:text-emerald-400' : q.score >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>{q.score}%</span></td>
                      <td className="py-2.5">{q.letterGrade && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColor[q.letterGrade.color]}`}>{q.letterGrade.grade}</span>}</td>
                      <td className="py-2.5 text-slate-500">{q.totalQuestions}</td>
                      <td className="py-2.5 text-slate-500">#{q.attemptNumber}</td>
                      <td className="py-2.5 text-slate-500 text-xs">{q.completedAt ? new Date(q.completedAt).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </ReportSection>

        {/* ═══ EXAMS ═══ */}
        <ReportSection title="Exam Performance" icon="GraduationCap" expanded={expandedSections.has('exams')} onToggle={() => toggleSection('exams')}>
          {exams.totalSessions === 0 ? (
            <div className="text-center py-8">
              <GraduationCap className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No exams completed yet. Start a practice exam to see your results here.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <StatCard label="Total Exams" value={exams.totalSessions} color="indigo" />
                <StatCard label="Average Score" value={`${exams.averageScore}%`} color={evalCtx.getScoreLabel(exams.averageScore).color} />
                <StatCard label="Best Score" value={`${exams.bestScore}%`} color="emerald" />
              </div>
              {exams.averageLetterGrade && (
                <div className="flex items-center gap-4 mb-6 bg-slate-50 dark:bg-gray-800 rounded-2xl p-5 border border-slate-200 dark:border-gray-700">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black ${badgeColor[exams.averageLetterGrade.color] || badgeColor.slate}`}>
                    {exams.averageLetterGrade.grade}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Exam Letter Grade: {exams.averageLetterGrade.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Based on your average of {exams.averageScore}%</p>
                  </div>
                </div>
              )}
              {exams.recentSessions.length > 0 && (
                <div className="bg-slate-50 dark:bg-gray-800 rounded-2xl p-5 border border-slate-200 dark:border-gray-700">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">Recent Exams</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-400 border-b border-slate-200 dark:border-gray-700">
                          <th className="pb-2 font-semibold">Textbook</th>
                          <th className="pb-2 font-semibold">Score</th>
                          <th className="pb-2 font-semibold">Grade</th>
                          <th className="pb-2 font-semibold">Correct/Total</th>
                          <th className="pb-2 font-semibold">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exams.recentSessions.map(e => (
                          <tr key={e.sessionId} className="border-b border-slate-100 dark:border-gray-800 last:border-0">
                            <td className="py-2.5 text-slate-700 dark:text-slate-300 font-medium">{e.textbookId}</td>
                            <td className="py-2.5"><span className={`font-bold ${e.score >= 70 ? 'text-emerald-600' : e.score >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{e.score}%</span></td>
                            <td className="py-2.5">{e.letterGrade && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColor[e.letterGrade.color]}`}>{e.letterGrade.grade}</span>}</td>
                            <td className="py-2.5 text-slate-500">{e.correctAnswers}/{e.totalQuestions}</td>
                            <td className="py-2.5 text-slate-500 text-xs">{e.completedAt ? new Date(e.completedAt).toLocaleDateString() : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </ReportSection>

        {/* ═══ ESLCE (Grade 12 only) ═══ */}
        {eslce && (
          <ReportSection title="ESLCE Readiness" icon="Award" expanded={expandedSections.has('eslce')} onToggle={() => toggleSection('eslce')}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="Sessions" value={eslce.totalSessions} color="indigo" />
              <StatCard label="Average" value={`${eslce.averageScore}%`} color={evalCtx.getScoreLabel(eslce.averageScore).color} />
              <StatCard label="Pass Rate" value={`${eslce.passRate}%`} color="emerald" />
              <StatCard label="Best Score" value={`${eslce.bestScore}%`} color="purple" />
            </div>
            {eslce.bySubject.length > 0 && (
              <div className="bg-slate-50 dark:bg-gray-800 rounded-2xl p-5 border border-slate-200 dark:border-gray-700 mb-4">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">By Subject</p>
                <div className="space-y-3">
                  {eslce.bySubject.map(s => (
                    <div key={s.subject} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-xl border border-slate-100 dark:border-gray-800">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-8 rounded-full ${s.passed ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <div>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{s.subject}</p>
                          <p className="text-xs text-slate-500">{s.sessions} sessions &middot; Best: {s.bestScore}%</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${s.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{s.averageScore}%</p>
                        {s.letterGrade && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColor[s.letterGrade.color]}`}>{s.letterGrade.grade}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-slate-50 dark:bg-gray-800 rounded-2xl p-5 border border-slate-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">Recent Sessions</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 border-b border-slate-200 dark:border-gray-700">
                      <th className="pb-2 font-semibold">Subject</th>
                      <th className="pb-2 font-semibold">Type</th>
                      <th className="pb-2 font-semibold">Score</th>
                      <th className="pb-2 font-semibold">Grade</th>
                      <th className="pb-2 font-semibold">C/W/U</th>
                      <th className="pb-2 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eslce.recentSessions.map(s => (
                      <tr key={s.sessionId} className="border-b border-slate-100 dark:border-gray-800 last:border-0">
                        <td className="py-2.5 text-slate-700 dark:text-slate-300 font-medium">{s.subject}</td>
                        <td className="py-2.5 text-xs text-slate-500">{s.examType}/{s.mode}</td>
                        <td className="py-2.5"><span className={`font-bold ${s.percentage >= 70 ? 'text-emerald-600' : s.percentage >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{s.percentage}%</span></td>
                        <td className="py-2.5">{s.letterGrade && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColor[s.letterGrade.color]}`}>{s.letterGrade.grade}</span>}</td>
                        <td className="py-2.5 text-slate-500 text-xs">{s.correctCount}/{s.wrongCount}/{s.unansweredCount}</td>
                        <td className="py-2.5 text-slate-500 text-xs">{s.completedAt ? new Date(s.completedAt).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </ReportSection>
        )}

        {/* ═══ MASTERY ═══ */}
        <ReportSection title="Subject Mastery" icon="Brain" expanded={expandedSections.has('mastery')} onToggle={() => toggleSection('mastery')}>
          {mastery.subjects.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No mastery data yet. Start studying and taking quizzes to build your mastery profile.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-6 bg-slate-50 dark:bg-gray-800 rounded-2xl p-5 border border-slate-200 dark:border-gray-700">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black ${badgeColor[mastery.overallLetterGrade.color]}`}>
                  {mastery.overallLetterGrade.grade}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Overall Mastery: {mastery.overallMastery}%</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{mastery.description}</p>
                </div>
              </div>
              <div className="space-y-3">
                {mastery.subjects.map(s => (
                  <div key={s.textbookId} className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-slate-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColor[s.letterGrade.color]}`}>{s.letterGrade.grade}</span>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{s.textbookId}</span>
                        {s.masteryStatus && <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{s.masteryStatus}</span>}
                      </div>
                      <span className="text-lg font-bold text-slate-900 dark:text-white">{s.currentScore}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                      <div className={`h-2 rounded-full transition-all ${s.currentScore >= 70 ? 'bg-emerald-500' : s.currentScore >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(s.currentScore, 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Baseline: {s.baselineScore}%</span>
                      <span>Growth: {s.growthDelta > 0 ? '+' : ''}{s.growthDelta}%</span>
                      <span>Accuracy: {s.accuracy}%</span>
                      <span>{s.questionsAttempted} questions</span>
                    </div>
                    {(s.strengthArea || s.weaknessArea) && (
                      <div className="mt-2 flex gap-4 text-xs">
                        {s.strengthArea && <span className="text-emerald-600 dark:text-emerald-400">Strength: {s.strengthArea}</span>}
                        {s.weaknessArea && <span className="text-rose-600 dark:text-rose-400">Weakness: {s.weaknessArea}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </ReportSection>

        {/* ═══ METRICS ═══ */}
        <ReportSection title="Performance Metrics" icon="Activity" expanded={expandedSections.has('metrics')} onToggle={() => toggleSection('metrics')}>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{metrics.description}</p>
          <div className="space-y-4">
            {(['accuracy', 'consistency', 'responseTime', 'completion', 'mastery', 'improvement', 'risk'] as const).map(key => {
              const def = evalCtx.getMetricDef(key);
              const data = metrics[key];
              if (!def) return null;
              const Icon = iconMap[def.icon] || Activity;
              const value = data.value;
              const label = data.label;
              const unit = def.unit;
              const isTime = key === 'responseTime';
              return (
                <div key={key} className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-slate-200 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${colorMap[def.color] || colorMap.slate}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{def.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{def.shortDescription}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-slate-900 dark:text-white">{isTime ? `${value}s` : `${value}${unit === '%' ? '%' : ''}`}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColor[label.color] || badgeColor.slate}`}>{label.label}</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-gray-800 rounded-xl p-3 mb-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">How it works</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{def.calculation}</p>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 mb-3">
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1">Interpretation</p>
                    <p className="text-xs text-indigo-800 dark:text-indigo-300">
                      {(() => {
                        const tier = evalCtx.getScoreLabel(value, def.id);
                        if (tier.label === 'Excellent' || tier.label === 'Very Fast' || tier.label === 'Low Risk' || tier.label === 'Fast') return def.interpretation.high;
                        if (tier.label === 'Needs Work' || tier.label === 'Slow' || tier.label === 'High Risk') return def.interpretation.low;
                        return def.interpretation.medium;
                      })()}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-gray-800 rounded-xl p-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Example</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{def.example}</p>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">How to Improve</p>
                    <ul className="space-y-1">
                      {def.howToImprove.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </ReportSection>

        {/* ═══ RECOMMENDATIONS ═══ */}
        <ReportSection title="Recommendations" icon="Lightbulb" expanded={expandedSections.has('recommendations')} onToggle={() => toggleSection('recommendations')}>
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div key={i} className={`rounded-2xl p-5 border ${
                rec.priority === 'high' ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800' :
                rec.priority === 'medium' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' :
                'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg ${
                    rec.priority === 'high' ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400' :
                    rec.priority === 'medium' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' :
                    'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {rec.priority === 'high' ? <AlertCircle className="h-4 w-4" /> :
                     rec.priority === 'medium' ? <AlertTriangle className="h-4 w-4" /> :
                     <CheckCircle className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        rec.priority === 'high' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' :
                        rec.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      }`}>{rec.priority}</span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{rec.area}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">{rec.message}</p>
                    <ul className="space-y-1">
                      {rec.actions.map((a, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-indigo-400" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ReportSection>
      </div>
    </div>
  );
}

function ReportSection({ title, icon, expanded, onToggle, children }: {
  title: string; icon: string; expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  const Icon = iconMap[icon] || LayoutDashboard;
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200 dark:border-gray-700 overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
        </div>
        {expanded ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
      </button>
      {expanded && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: React.ReactNode; color: string }) {
  return (
    <div className={`rounded-2xl p-4 border ${colorMap[color] || colorMap.slate}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-xl font-black mt-1">{value}</p>
    </div>
  );
}

function InfoCard({ icon, title, value, description }: { icon: string; title: string; value: string; description: string }) {
  const Icon = iconMap[icon] || Activity;
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-slate-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-indigo-500" />
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{title}</p>
      </div>
      <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{description}</p>
    </div>
  );
}
