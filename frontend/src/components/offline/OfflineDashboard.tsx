/**
 * Offline Dashboard
 * Shows grade overview, quick stats, and entry points for offline features.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOfflineMode } from '../../context/OfflineContext';
import { getSectionProgress } from '../../services/offlineDb';

export default function OfflineDashboard() {
  const navigate = useNavigate();
  const { textbooks, stats, refreshStats, disableOfflineMode } = useOfflineMode();
  const [progressData, setProgressData] = useState<any[]>([]);

  useEffect(() => {
    refreshStats();
    // Load progress per textbook
    const loadProgress = async () => {
      const allProgress: any[] = [];
      for (const tb of textbooks) {
        const prog = await getSectionProgress(tb.stb_id);
        allProgress.push({
          stb_id: tb.stb_id,
          title: tb.title,
          subject: tb.subject_id,
          total: tb.section_count || 0,
          completed: prog.filter((p: any) => p.is_completed).length,
        });
      }
      setProgressData(allProgress);
    };
    if (textbooks.length > 0) loadProgress();
  }, [textbooks, refreshStats]);

  const features = [
    { icon: '📚', label: 'Study', desc: 'Read textbook content, notes, slides', path: '/offline/study' },
    { icon: '❓', label: 'Quizzes', desc: 'Practice quiz questions', path: '/offline/quiz' },
    { icon: '📝', label: 'Exams', desc: 'Practice and timed exams', path: '/offline/exam' },
    { icon: '🎓', label: 'ESLCE', desc: 'Past national exam papers', path: '/offline/eslce' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Menen OSHS</h1>
            <p className="text-indigo-100 mt-1">Grade 12 — Offline Mode</p>
          </div>
          <button
            onClick={disableOfflineMode}
            className="px-3 py-1.5 bg-white/20 rounded-lg text-sm hover:bg-white/30 transition"
          >
            Go Online →
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Textbooks', value: stats.textbook_count ?? textbooks.length, color: 'text-blue-600' },
          { label: 'Completed', value: stats.sections_completed ?? 0, color: 'text-green-600' },
          { label: 'Quizzes', value: stats.quiz_count ?? 0, color: 'text-purple-600' },
          { label: 'Avg Score', value: `${(stats.avg_quiz_score ?? 0).toFixed(0)}%`, color: 'text-orange-600' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {features.map(f => (
          <button
            key={f.path}
            onClick={() => navigate(f.path)}
            className="p-5 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-md transition text-left"
          >
            <div className="text-2xl mb-2">{f.icon}</div>
            <div className="font-semibold text-gray-800 dark:text-white">{f.label}</div>
            <div className="text-xs text-gray-500 mt-1">{f.desc}</div>
          </button>
        ))}
      </div>

      {/* Textbook progress */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Textbook Progress</h3>
        <div className="space-y-3">
          {progressData.map(p => {
            const pct = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;
            return (
              <div key={p.stb_id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300">{p.title}</span>
                  <span className="text-gray-500">{p.completed}/{p.total}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
