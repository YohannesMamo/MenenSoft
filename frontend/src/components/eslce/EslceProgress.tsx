import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../config/api'
import { TrendingUp, TrendingDown, Trophy, ChevronRight, BarChart3 } from 'lucide-react'

interface Overview {
  total_sessions: number; avg_percentage: number; best_percentage: number
  total_correct: number; total_wrong: number; total_unanswered: number
  recent_sessions: {
    session_id: number; subject_name: string; title: string | null
    exam_type: string; mode: string
    correct_count: number; wrong_count: number; unanswered_count: number
    percentage: number; completed_at: string | null
  }[]
}

interface SubjectRow {
  subject_name: string; sessions: number; avg_percentage: number
  total_correct: number; total_wrong: number
}

interface HistoryPage {
  total: number; sessions: {
    id: number; subject_name: string; title: string | null
    exam_type: string; mode: string; total_questions: number
    correct_count: number; wrong_count: number; unanswered_count: number
    percentage: number; completed_at: string | null
  }[]
}

export default function EslceProgress() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState<Overview | null>(null)
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [history, setHistory] = useState<HistoryPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [historyPage, setHistoryPage] = useState(0)
  const pageSize = 10

  useEffect(() => {
    const load = async () => {
      const [ovRes, subRes, histRes] = await Promise.all([
        apiFetch('/api/eslce/progress/overview'),
        apiFetch('/api/eslce/progress/subjects'),
        apiFetch(`/api/eslce/progress/history?limit=${pageSize}&offset=0`),
      ])
      if (ovRes.ok) setOverview(await ovRes.json())
      if (subRes.ok) setSubjects(await subRes.json())
      if (histRes.ok) setHistory(await histRes.json())
      setLoading(false)
    }
    load()
  }, [])

  const loadHistoryPage = async (page: number) => {
    const res = await apiFetch(`/api/eslce/progress/history?limit=${pageSize}&offset=${page * pageSize}`)
    if (res.ok) {
      setHistory(await res.json())
      setHistoryPage(page)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (!overview || overview.total_sessions === 0) {
    return (
      <div className="text-center py-16">
        <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400 mb-4 text-lg">No practice sessions yet</p>
        <p className="text-gray-400 dark:text-gray-500 mb-6 text-sm">Complete your first ESLCE exam to start tracking your progress</p>
        <button onClick={() => navigate('/eslce')} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors">
          Browse ESLCE Exams
        </button>
      </div>
    )
  }

  const totalQuestions = overview.total_correct + overview.total_wrong + overview.total_unanswered
  const passCount = overview.recent_sessions.filter(s => s.percentage >= 70).length
  const failCount = overview.total_sessions - passCount

  const pastSessions = overview.recent_sessions.filter(s => s.exam_type === 'past')
  const predictedSessions = overview.recent_sessions.filter(s => s.exam_type === 'predicted')
  const examModeSessions = overview.recent_sessions.filter(s => s.mode === 'exam')
  const practiceModeSessions = overview.recent_sessions.filter(s => s.mode === 'practice')
  const avgPastPct = pastSessions.length > 0
    ? Math.round(pastSessions.reduce((a, s) => a + s.percentage, 0) / pastSessions.length)
    : 0
  const avgPredictedPct = predictedSessions.length > 0
    ? Math.round(predictedSessions.reduce((a, s) => a + s.percentage, 0) / predictedSessions.length)
    : 0

  const sessions = overview.recent_sessions
  const trendUp = sessions.length >= 2 && sessions[0].percentage > sessions[sessions.length - 1].percentage

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">ESLCE Progress</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">Track your exam performance and improvement over time</p>

      {/* Top overview row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Sessions', value: overview.total_sessions, icon: BarChart3 },
          { label: 'Avg Score', value: `${overview.avg_percentage}%`, icon: TrendingUp, color: overview.avg_percentage >= 70 ? 'text-emerald-600 dark:text-emerald-400' : overview.avg_percentage >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400' },
          { label: 'Best Score', value: `${overview.best_percentage}%`, icon: Trophy, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Pass Rate', value: totalQuestions > 0 ? `${Math.round((overview.total_correct / totalQuestions) * 100)}%` : '0%', icon: TrendingUp, color: 'text-indigo-600 dark:text-indigo-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color || 'text-gray-400 dark:text-gray-500'}`} />
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
            </div>
            <div className={`text-2xl font-bold ${color || 'text-gray-900 dark:text-white'}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Pass/Fail & Mode breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Pass/Fail */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-800 dark:text-gray-300 mb-3 text-sm uppercase tracking-wider">Pass / Fail</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{passCount}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">passed</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-red-500 dark:text-red-400">{failCount}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">failed</span>
              </div>
            </div>
            <div className="w-24 h-24 rounded-full relative">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-gray-100 dark:stroke-gray-700" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-emerald-500" strokeWidth="3"
                  strokeDasharray={`${overview.total_sessions > 0 ? (passCount / overview.total_sessions) * 97.4 : 0} 97.4`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  {overview.total_sessions > 0 ? Math.round((passCount / overview.total_sessions) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mode breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-800 dark:text-gray-300 mb-3 text-sm uppercase tracking-wider">By Mode</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Exam</span>
                <span className="text-gray-500 dark:text-gray-400">{examModeSessions.length} sessions</span>
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${overview.total_sessions > 0 ? (examModeSessions.length / overview.total_sessions) * 100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Practice</span>
                <span className="text-gray-500 dark:text-gray-400">{practiceModeSessions.length} sessions</span>
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${overview.total_sessions > 0 ? (practiceModeSessions.length / overview.total_sessions) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Past Exams</span>
                <span className="text-gray-500 dark:text-gray-400">avg {avgPastPct}%</span>
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${avgPastPct}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Predicted Exams</span>
                <span className="text-gray-500 dark:text-gray-400">avg {avgPredictedPct}%</span>
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full" style={{ width: `${avgPredictedPct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Score trend (last 10 sessions) */}
      {sessions.length >= 2 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-300 text-sm uppercase tracking-wider">Score Trend</h3>
            <div className="flex items-center gap-1.5">
              {trendUp ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm font-medium ${trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                {trendUp ? 'Improving' : 'Needs work'}
              </span>
            </div>
          </div>
          <div className="flex items-end gap-1.5 h-32">
            {[...sessions].reverse().map((s, i) => {
              const height = Math.max(8, s.percentage)
              const color = s.percentage >= 70 ? 'bg-emerald-500' : s.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className={`w-full ${color} rounded-t-md transition-all group-hover:opacity-80`} style={{ height: `${height}%` }} />
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 truncate w-full text-center">{s.percentage}%</span>
                  <div className="absolute -top-8 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {s.subject_name} · {s.percentage}%
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-gray-400 dark:text-gray-500">
            <span>Oldest</span>
            <span>Newest</span>
          </div>
        </div>
      )}

      {/* By subject */}
      {subjects.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-8">
          <h3 className="font-semibold text-gray-800 dark:text-gray-300 mb-4 text-sm uppercase tracking-wider">By Subject</h3>
          <div className="space-y-3">
            {subjects.sort((a, b) => b.avg_percentage - a.avg_percentage).map((s) => (
              <div key={s.subject_name} className="flex items-center gap-4">
                <div className="w-36 min-w-0">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-400 truncate block">{s.subject_name}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{s.sessions} sessions</span>
                </div>
                <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${s.avg_percentage >= 70 ? 'bg-emerald-500' : s.avg_percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(100, s.avg_percentage)}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-12 text-right">{s.avg_percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full history table */}
      {history && history.sessions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-800 dark:text-gray-300 mb-4 text-sm uppercase tracking-wider">Session History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Subject</th>
                  <th className="text-left py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                  <th className="text-left py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Mode</th>
                  <th className="text-center py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Score</th>
                  <th className="text-center py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">C/W/U</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {history.sessions.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors"
                    onClick={() => navigate(`/eslce/history/${s.id}`)}
                  >
                    <td className="py-2.5 text-gray-800 dark:text-gray-300 font-medium max-w-[180px] truncate">{s.subject_name}</td>
                    <td className="py-2.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        s.exam_type === 'past' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                        {s.exam_type}
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-500 dark:text-gray-400 capitalize">{s.mode}</td>
                    <td className="py-2.5 text-center">
                      <span className={`font-bold ${s.percentage >= 70 ? 'text-emerald-600 dark:text-emerald-400' : s.percentage >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                        {s.percentage}%
                      </span>
                    </td>
                    <td className="py-2.5 text-center text-gray-500 dark:text-gray-400 text-xs">
                      <span className="text-emerald-600 dark:text-emerald-400">{s.correct_count}</span>
                      {' / '}
                      <span className="text-red-500 dark:text-red-400">{s.wrong_count}</span>
                      {' / '}
                      <span className="text-gray-400">{s.unanswered_count}</span>
                    </td>
                    <td className="py-2.5 text-right text-xs text-gray-400 dark:text-gray-500">
                      {s.completed_at ? new Date(s.completed_at).toLocaleDateString() : ''}
                    </td>
                    <td className="py-2.5">
                      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {history.total > pageSize && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Showing {historyPage * pageSize + 1}–{Math.min((historyPage + 1) * pageSize, history.total)} of {history.total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => loadHistoryPage(historyPage - 1)}
                  disabled={historyPage === 0}
                  className="px-3 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => loadHistoryPage(historyPage + 1)}
                  disabled={(historyPage + 1) * pageSize >= history.total}
                  className="px-3 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
