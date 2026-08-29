import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, User, Printer, BookOpen, CheckCircle, AlertTriangle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface LetterGrade { grade: string; min: number; color: string; label: string; }

interface SubjectStudy {
  subject: string; sectionsStudied: number; sectionsCompleted: number;
  gradeTotalSections?: number;
  completionRate: number; studyMinutes: number; textbookCount: number;
}
interface SubjectQuiz {
  textbookId: string; attempts: number; averageScore: number; bestScore: number;
  letterGrade: LetterGrade | null;
}
interface SubjectExam {
  subject: string; sessions: number; averageScore: number; bestScore: number;
  letterGrade: LetterGrade | null; correctAnswers: number; wrongAnswers: number;
  totalQuestions: number; accuracy: number;
}
interface SubjectMastery {
  textbookId: string; currentScore: number; baselineScore: number; growthDelta: number;
  strengthArea: string; weaknessArea: string; masteryStatus: string;
  questionsAttempted: number; correctAnswers: number; accuracy: number;
  growthIndex: number; letterGrade: LetterGrade;
}

interface ReportData {
  student: {
    studentId: string; fullName: string; gradeLevel: string; gender: string;
    subscriptionStatus: string;
    reportingPerson?: { name: string; phone: string; relation: string; } | null;
  };
  reportGeneratedAt: string;
  study: {
    totalSessions: number; totalSectionsStudied: number; totalSectionsCompleted: number;
    gradeTotalSections?: number; targetStudyHours?: number;
    totalStudyHours: number; totalStudyMinutes: number; textbookCount: number;
    textbooksStudied: string[]; averageSessionMinutes: number; completionRate: number;
    description: string; bySubject: SubjectStudy[];
    recentSessions: Array<{ textbookId: string; chapterId: number; startedAt: string; endedAt: string; pagesCovered: string; }>;
  };
  quizzes: {
    totalSessions: number; averageScore: number; bestScore: number; worstScore: number;
    averageLetterGrade: LetterGrade | null; gradeDistribution: Record<string, number>;
    totalQuestionsAnswered: number; totalTimeSpentMinutes: number; averageTimePerQuestion: number;
    byTextbook: SubjectQuiz[];
    recentSessions: Array<{ sessionId: string; textbookId: string; sectionId: string; score: number;
      totalQuestions: number; attemptNumber: number; completedAt: string; letterGrade: LetterGrade | null; }>;
    description: string;
  };
  exams: {
    totalSessions: number; averageScore: number; bestScore: number;
    averageLetterGrade: LetterGrade | null; gradeDistribution: Record<string, number>;
    bySubject: SubjectExam[];
    recentSessions: Array<{ sessionId: string; textbookId: string; sectionId: string; score: number;
      correctAnswers: number; wrongAnswers: number; totalQuestions: number;
      attemptNumber: number; completedAt: string; letterGrade: LetterGrade | null; }>;
    description: string;
  };
  eslce: any;
  mastery: {
    overallMastery: number; overallLetterGrade: LetterGrade;
    subjects: SubjectMastery[];
    strongestSubject: any; weakestSubject: any;
    totalQuestionsAttempted: number; totalCorrectAnswers: number; description: string;
  };
  metrics: {
    accuracy: { value: number; label: { label: string; color: string; } };
    consistency: { value: number; label: { label: string; color: string; } };
    responseTime: { value: number; label: { label: string; color: string; } };
    completion: { value: number; label: { label: string; color: string; } };
    mastery: { value: number; label: { label: string; color: string; } };
    improvement: { value: number; label: { label: string; color: string; } };
    risk: { value: number; label: { label: string; color: string; } };
    velocity: string; stability: string; status: string; description: string;
  };
  recommendations: Array<{ priority: string; area: string; message: string; actions: string[]; }>;
  overallGrade: LetterGrade;
}

const colorMap: Record<string, string> = {
  green: 'bg-green-100 text-green-800 border-green-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  red: 'bg-red-100 text-red-800 border-red-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

function GradeBadge({ grade, size = 'sm' }: { grade: LetterGrade | null; size?: 'sm' | 'lg' }) {
  if (!grade) return <span className="text-gray-400">--</span>;
  const cls = colorMap[grade.color] || 'bg-gray-100 text-gray-800';
  const sz = size === 'lg' ? 'text-2xl px-4 py-2' : 'text-xs px-2 py-0.5';
  return <span className={`inline-block font-bold rounded-lg border ${cls} ${sz}`}>{grade.grade}</span>;
}

function SubjectRow({ subject, study, quiz, exam, mastery }: {
  subject: string; study?: SubjectStudy; quiz?: SubjectQuiz; exam?: SubjectExam; mastery?: SubjectMastery;
}) {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td className="py-2 px-3 font-semibold text-gray-800 dark:text-gray-200 text-sm">{subject}</td>
      <td className="py-2 px-3 text-center text-sm">
        {study ? (
          <span>
            <span className="font-bold">{study.sectionsCompleted}/{study.sectionsStudied}</span>
            <span className="text-gray-500 ml-1">({study.completionRate}%)</span>
            <br /><span className="text-xs text-gray-400">{Math.round(study.studyMinutes)}min</span>
          </span>
        ) : <span className="text-gray-300">--</span>}
      </td>
      <td className="py-2 px-3 text-center text-sm">
        {quiz ? (
          <span>
            <span className="font-bold">{quiz.averageScore}%</span>
            <GradeBadge grade={quiz.letterGrade} />
            <br /><span className="text-xs text-gray-400">{quiz.attempts} attempts</span>
          </span>
        ) : <span className="text-gray-300">--</span>}
      </td>
      <td className="py-2 px-3 text-center text-sm">
        {exam ? (
          <span>
            <span className="font-bold">{exam.averageScore}%</span>
            <GradeBadge grade={exam.letterGrade} />
            <br /><span className="text-xs text-gray-400">{exam.accuracy}% accuracy</span>
          </span>
        ) : <span className="text-gray-300">--</span>}
      </td>
      <td className="py-2 px-3 text-center text-sm">
        {mastery ? (
          <span>
            <span className="font-bold">{mastery.currentScore}%</span>
            <GradeBadge grade={mastery.letterGrade} />
            <br /><span className={`text-xs ${mastery.growthDelta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {mastery.growthDelta >= 0 ? '+' : ''}{mastery.growthDelta}%
            </span>
          </span>
        ) : <span className="text-gray-300">--</span>}
      </td>
    </tr>
  );
}

export default function DetailedReportPage() {
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [smsStatus, setSmsStatus] = useState<string | null>(null);
  const [smsSending, setSmsSending] = useState(false);
  const [showRepEditor, setShowRepEditor] = useState(false);
  const [repForm, setRepForm] = useState({ name: '', phone: '', relation: '' });

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
        if (data.student.reportingPerson) {
          setRepForm(data.student.reportingPerson);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handlePrint = () => window.print();

  const handleSendSms = async () => {
    if (!report) return;
    setSmsSending(true);
    setSmsStatus(null);
    try {
      const token = localStorage.getItem('token');
      const phone = repForm.phone || report.student.reportingPerson?.phone;
      if (!phone) { setSmsStatus('No phone number configured. Please set a reporting person first.'); setSmsSending(false); return; }
      const res = await fetch(`${API_BASE}/api/evaluation/send-sms`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, report }),
      });
      const data = await res.json();
      if (res.ok) {
        setSmsStatus(`SMS sent successfully to ${phone} (${data.messageLength} chars)`);
      } else {
        setSmsStatus(`Error: ${data.detail || 'Failed to send'}`);
      }
    } catch (e: any) {
      setSmsStatus(`Error: ${e.message}`);
    } finally {
      setSmsSending(false);
    }
  };

  const handleSaveRep = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/evaluation/reporting-person`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(repForm),
      });
      if (res.ok) {
        setReport(prev => prev ? { ...prev, student: { ...prev.student, reportingPerson: repForm } } : prev);
        setShowRepEditor(false);
      }
    } catch {}
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen dark:bg-gray-900"><p className="text-gray-500 dark:text-gray-400">Loading detailed report...</p></div>;
  if (error) return <div className="flex items-center justify-center min-h-screen dark:bg-gray-900"><p className="text-red-500">{error}</p></div>;
  if (!report) return null;

  const studyMap = Object.fromEntries((report.study.bySubject || []).map(s => [s.subject, s]));
  const quizMap = Object.fromEntries((report.quizzes.byTextbook || []).map(q => [q.textbookId, q]));
  const examMap = Object.fromEntries((report.exams.bySubject || []).map(e => [e.subject, e]));
  const masteryMap = Object.fromEntries((report.mastery.subjects || []).map(m => [m.textbookId, m]));

  const allSubjects = new Set<string>();
  Object.keys(studyMap).forEach(k => allSubjects.add(k));
  Object.keys(quizMap).forEach(k => allSubjects.add(k));
  Object.keys(examMap).forEach(k => allSubjects.add(k));
  Object.keys(masteryMap).forEach(k => allSubjects.add(k));

  const sortedSubjects = Array.from(allSubjects).sort();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Non-print toolbar */}
      <div className="no-print sticky top-0 z-50 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-3 flex items-center justify-between shadow-sm">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition">
          <ArrowLeft size={18} /> Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowRepEditor(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition">
            <User size={14} /> Reporting Person
          </button>
          <button onClick={handleSendSms} disabled={smsSending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50">
            <Send size={14} /> {smsSending ? 'Sending...' : 'Send SMS'}
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
            <Printer size={14} /> Print / PDF
          </button>
        </div>
      </div>

      {smsStatus && (
        <div className="no-print mx-4 mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm">
          {smsStatus}
        </div>
      )}

      {/* Reporting Person Modal */}
      {showRepEditor && (
        <div className="no-print fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2"><User size={20} /> Reporting Person</h3>
            <div className="space-y-3">
              <input value={repForm.name} onChange={e => setRepForm({ ...repForm, name: e.target.value })}
                placeholder="Full Name" className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm" />
              <input value={repForm.phone} onChange={e => setRepForm({ ...repForm, phone: e.target.value })}
                placeholder="Phone Number (+251...)" className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm" />
              <select value={repForm.relation} onChange={e => setRepForm({ ...repForm, relation: e.target.value })}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm">
                <option value="">Select Relationship</option>
                <option value="Parent">Parent</option>
                <option value="Guardian">Guardian</option>
                <option value="Sibling">Sibling</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSaveRep} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700">Save</button>
              <button onClick={() => setShowRepEditor(false)} className="flex-1 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT CONTENT */}
      <div className="max-w-4xl mx-auto px-6 py-8 print-content">
        {/* Header */}
        <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
          <h1 className="text-2xl font-black text-gray-900">MERP STUDENT REPORT CARD</h1>
          <p className="text-gray-600 mt-1">Menen Robi Student Assistant System</p>
          <div className="mt-3 text-sm text-gray-700">
            <p><strong>Student:</strong> {report.student.fullName}</p>
            <p><strong>Grade:</strong> {report.student.gradeLevel} &nbsp;|&nbsp; <strong>ID:</strong> {report.student.studentId}</p>
            {report.student.reportingPerson && (
              <p><strong>Reporting Person:</strong> {report.student.reportingPerson.name} ({report.student.reportingPerson.relation}) - {report.student.reportingPerson.phone}</p>
            )}
          </div>
          <div className="mt-3 flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase">Overall Grade</p>
              <GradeBadge grade={report.overallGrade} size="lg" />
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase">Risk Status</p>
              <span className={`text-sm font-bold px-3 py-1 rounded-lg border ${
                report.metrics.status === 'OnTrack' ? 'bg-green-100 text-green-800 border-green-200' :
                report.metrics.status === 'AtRisk' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                'bg-red-100 text-red-800 border-red-200'
              }`}>{report.metrics.status.replace('HighRisk', 'High Risk').replace('AtRisk', 'At Risk').replace('OnTrack', 'On Track')}</span>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase">Report Date</p>
              <p className="text-sm font-semibold text-gray-700">{report.reportGeneratedAt.slice(0, 10)}</p>
            </div>
          </div>
        </div>

        {/* SUBJECT-LEVEL COMPARISON TABLE */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
            <BookOpen size={18} /> Subject Performance Summary
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800 text-left">
                  <th className="py-2 px-3 font-bold text-gray-700 dark:text-gray-300">Subject</th>
                  <th className="py-2 px-3 font-bold text-gray-700 dark:text-gray-300 text-center">Study</th>
                  <th className="py-2 px-3 font-bold text-gray-700 dark:text-gray-300 text-center">Quiz</th>
                  <th className="py-2 px-3 font-bold text-gray-700 dark:text-gray-300 text-center">Exam</th>
                  <th className="py-2 px-3 font-bold text-gray-700 dark:text-gray-300 text-center">Mastery</th>
                </tr>
              </thead>
              <tbody>
                {sortedSubjects.map(subj => (
                  <SubjectRow key={subj} subject={subj}
                    study={studyMap[subj]} quiz={quizMap[subj]} exam={examMap[subj]} mastery={masteryMap[subj]} />
                ))}
                {sortedSubjects.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-gray-400">No subject data available yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* STUDY DETAIL */}
        <div className="mb-6 page-break-inside-avoid">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2 border-b pb-1">Study Activity</h2>
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-black text-indigo-600">{report.study.totalSessions}</p>
              <p className="text-xs text-gray-500">Sessions</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-black text-indigo-600">{report.study.totalSectionsCompleted}/{report.study.gradeTotalSections ?? report.study.totalSectionsStudied}</p>
              <p className="text-xs text-gray-500">Sections Done</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-black text-indigo-600">{report.study.totalStudyHours}h</p>
              <p className="text-xs text-gray-500">Study Hours</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-black text-indigo-600">{report.study.completionRate}%</p>
              <p className="text-xs text-gray-500">Completion</p>
            </div>
          </div>
          <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 mt-3 mb-1">By Subject</h3>
          {report.study.bySubject?.length > 0 ? (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th className="py-1 px-2 text-left text-xs font-bold text-gray-600">Subject</th>
                  <th className="py-1 px-2 text-center text-xs font-bold text-gray-600">Completed</th>
                  <th className="py-1 px-2 text-center text-xs font-bold text-gray-600">Rate</th>
                  <th className="py-1 px-2 text-center text-xs font-bold text-gray-600">Minutes</th>
                </tr>
              </thead>
              <tbody>
                {report.study.bySubject.map(s => (
                  <tr key={s.subject} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="py-1 px-2 font-medium">{s.subject}</td>
                    <td className="py-1 px-2 text-center">{s.sectionsCompleted}/{s.sectionsStudied}</td>
                    <td className="py-1 px-2 text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${s.completionRate}%` }} />
                        </div>
                        <span className="text-xs">{s.completionRate}%</span>
                      </div>
                    </td>
                    <td className="py-1 px-2 text-center text-xs">{Math.round(s.studyMinutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-gray-400">No study data</p>}
        </div>

        {/* QUIZ DETAIL */}
        <div className="mb-6 page-break-inside-avoid">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2 border-b pb-1">Quiz Performance</h2>
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-black text-indigo-600">{report.quizzes.totalSessions}</p>
              <p className="text-xs text-gray-500">Quizzes Taken</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-black text-indigo-600">{report.quizzes.averageScore}%</p>
              <p className="text-xs text-gray-500">Average</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-black text-indigo-600">{report.quizzes.bestScore}%</p>
              <p className="text-xs text-gray-500">Best Score</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-black text-indigo-600">{report.quizzes.totalQuestionsAnswered}</p>
              <p className="text-xs text-gray-500">Questions</p>
            </div>
          </div>
          <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 mt-3 mb-1">By Subject</h3>
          {report.quizzes.byTextbook?.length > 0 ? (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th className="py-1 px-2 text-left text-xs font-bold text-gray-600">Subject</th>
                  <th className="py-1 px-2 text-center text-xs font-bold text-gray-600">Attempts</th>
                  <th className="py-1 px-2 text-center text-xs font-bold text-gray-600">Average</th>
                  <th className="py-1 px-2 text-center text-xs font-bold text-gray-600">Best</th>
                  <th className="py-1 px-2 text-center text-xs font-bold text-gray-600">Grade</th>
                </tr>
              </thead>
              <tbody>
                {report.quizzes.byTextbook.map(q => (
                  <tr key={q.textbookId} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="py-1 px-2 font-medium">{q.textbookId}</td>
                    <td className="py-1 px-2 text-center">{q.attempts}</td>
                    <td className="py-1 px-2 text-center font-bold">{q.averageScore}%</td>
                    <td className="py-1 px-2 text-center">{q.bestScore}%</td>
                    <td className="py-1 px-2 text-center"><GradeBadge grade={q.letterGrade} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-gray-400">No quiz data</p>}
        </div>

        {/* EXAM DETAIL */}
        {report.exams.totalSessions > 0 && (
          <div className="mb-6 page-break-inside-avoid">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2 border-b pb-1">Exam Performance</h2>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-2xl font-black text-indigo-600">{report.exams.totalSessions}</p>
                <p className="text-xs text-gray-500">Exams Taken</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-2xl font-black text-indigo-600">{report.exams.averageScore}%</p>
                <p className="text-xs text-gray-500">Average</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-2xl font-black text-indigo-600">{report.exams.bestScore}%</p>
                <p className="text-xs text-gray-500">Best Score</p>
              </div>
            </div>
            {report.exams.bySubject?.length > 0 && (
              <>
                <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 mt-3 mb-1">By Subject</h3>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <th className="py-1 px-2 text-left text-xs font-bold text-gray-600">Subject</th>
                      <th className="py-1 px-2 text-center text-xs font-bold text-gray-600">Sessions</th>
                      <th className="py-1 px-2 text-center text-xs font-bold text-gray-600">Average</th>
                      <th className="py-1 px-2 text-center text-xs font-bold text-gray-600">Accuracy</th>
                      <th className="py-1 px-2 text-center text-xs font-bold text-gray-600">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.exams.bySubject.map(e => (
                      <tr key={e.subject} className="border-t border-gray-100 dark:border-gray-700">
                        <td className="py-1 px-2 font-medium">{e.subject}</td>
                        <td className="py-1 px-2 text-center">{e.sessions}</td>
                        <td className="py-1 px-2 text-center font-bold">{e.averageScore}%</td>
                        <td className="py-1 px-2 text-center">{e.accuracy}%</td>
                        <td className="py-1 px-2 text-center"><GradeBadge grade={e.letterGrade} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}

        {/* MASTERY DETAIL */}
        <div className="mb-6 page-break-inside-avoid">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2 border-b pb-1">Subject Mastery</h2>
          <p className="text-sm text-gray-600 mb-3">Overall: <strong>{report.mastery.overallMastery}%</strong> <GradeBadge grade={report.mastery.overallLetterGrade} /></p>
          {report.mastery.subjects?.length > 0 ? (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th className="py-1 px-2 text-left text-xs font-bold text-gray-600">Subject</th>
                  <th className="py-1 px-2 text-center text-xs font-bold text-gray-600">Score</th>
                  <th className="py-1 px-2 text-center text-xs font-bold text-gray-600">Grade</th>
                  <th className="py-1 px-2 text-center text-xs font-bold text-gray-600">Growth</th>
                  <th className="py-1 px-2 text-center text-xs font-bold text-gray-600">Accuracy</th>
                  <th className="py-1 px-2 text-left text-xs font-bold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.mastery.subjects.map(m => (
                  <tr key={m.textbookId} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="py-1 px-2 font-medium">{m.textbookId}</td>
                    <td className="py-1 px-2 text-center font-bold">{m.currentScore}%</td>
                    <td className="py-1 px-2 text-center"><GradeBadge grade={m.letterGrade} /></td>
                    <td className={`py-1 px-2 text-center text-xs font-bold ${m.growthDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {m.growthDelta >= 0 ? '+' : ''}{m.growthDelta}%
                    </td>
                    <td className="py-1 px-2 text-center">{m.accuracy}%</td>
                    <td className="py-1 px-2 text-xs">{m.masteryStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-gray-400">No mastery data</p>}
        </div>

        {/* METRICS SUMMARY */}
        <div className="mb-6 page-break-inside-avoid">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2 border-b pb-1">Performance Metrics</h2>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(report.metrics).filter(([k]) => !['velocity', 'stability', 'status', 'description'].includes(k)).map(([key, val]: [string, any]) => (
              <div key={key} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                <p className="text-lg font-black text-gray-800 dark:text-gray-200">{val.value}{key === 'responseTime' ? 's' : '%'}</p>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-${val.label.color || 'gray'}-100 text-${val.label.color || 'gray'}-700`}>{val.label.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold">Velocity:</span> {report.metrics.velocity} &nbsp;|&nbsp;
            <span className="font-semibold">Stability:</span> {report.metrics.stability} &nbsp;|&nbsp;
            <span className="font-semibold">Status:</span> {report.metrics.status}
          </div>
        </div>

        {/* RECOMMENDATIONS */}
        {report.recommendations.length > 0 && (
          <div className="mb-6 page-break-inside-avoid">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2 border-b pb-1">Recommendations</h2>
            <div className="space-y-2">
              {report.recommendations.map((r, i) => (
                <div key={i} className={`p-3 rounded-lg border text-sm ${
                  r.priority === 'high' ? 'bg-red-50 border-red-200 text-red-800' :
                  r.priority === 'medium' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                  'bg-green-50 border-green-200 text-green-800'
                }`}>
                  <div className="flex items-start gap-2">
                    {r.priority === 'high' ? <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /> : <CheckCircle size={14} className="mt-0.5 flex-shrink-0" />}
                    <div>
                      <span className="font-bold uppercase text-[10px]">[{r.priority}] {r.area}</span>
                      <p className="mt-0.5">{r.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 border-t pt-3 mt-6">
          Generated by MERP Student Assistant on {new Date(report.reportGeneratedAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
