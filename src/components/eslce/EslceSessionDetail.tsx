import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../../config/api'
import { RichText } from '../../lib/content'
import EslceQuestionMedia from './EslceQuestionMedia'
import { ArrowLeft, CheckCircle, XCircle, MinusCircle, Clock } from 'lucide-react'

interface GradedResponse {
  question_id: number; selected_option_id: number | null
  is_correct: boolean; verdict: string
  question_text: string; correct_option_label: string | null; correct_option_text: string | null
  passage?: any; images?: any[]
}

interface SessionDetail {
  session_id: number; subject_name: string; title: string | null
  exam_type: string; mode: string; total_questions: number
  correct_count: number; wrong_count: number; unanswered_count: number
  percentage: number; time_spent_ms: number | null
  created_at: string | null; completed_at: string | null
  responses: GradedResponse[]
}

export default function EslceSessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    const load = async () => {
      const res = await apiFetch(`/api/eslce/progress/history/${sessionId}`)
      if (res.ok) setSession(await res.json())
      setLoading(false)
    }
    load()
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Session not found</p>
        <button onClick={() => navigate('/eslce/progress')} className="text-indigo-600 hover:text-indigo-700 font-medium">
          Back to progress
        </button>
      </div>
    )
  }

  const pct = session.percentage ?? 0
  const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 50 ? 'D' : 'F'
  const gradeColor = pct >= 70 ? 'text-emerald-600 dark:text-emerald-400' : pct >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
  const timeStr = session.time_spent_ms
    ? `${Math.floor(session.time_spent_ms / 60000)}m ${Math.floor((session.time_spent_ms % 60000) / 1000)}s`
    : null

  const correctResponses = session.responses.filter(r => r.verdict === 'correct')
  const wrongResponses = session.responses.filter(r => r.verdict === 'wrong')
  const skippedResponses = session.responses.filter(r => r.verdict === 'unanswered' || r.selected_option_id === null)

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate('/eslce/progress')} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-sm mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to progress
      </button>

      {/* Header card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6 text-center">
        <div className={`text-6xl font-bold mb-2 ${gradeColor}`}>{grade}</div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{pct}%</div>
        <div className="text-gray-500 dark:text-gray-400 text-sm">
          {session.subject_name} &middot; {session.title || `${session.exam_type} exam`}
        </div>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-400 dark:text-gray-500">
          <span className="capitalize">{session.mode} mode</span>
          {timeStr && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {timeStr}
            </span>
          )}
          {session.completed_at && (
            <span>{new Date(session.completed_at).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center">
          <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{session.correct_count}</div>
          <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Correct</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center">
          <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{session.wrong_count}</div>
          <div className="text-xs text-red-600/70 dark:text-red-400/70">Wrong</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 text-center">
          <MinusCircle className="w-5 h-5 text-gray-400 mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">{session.unanswered_count}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500">Unanswered</div>
        </div>
      </div>

      {/* Question filter tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { label: 'All', count: session.responses.length },
          { label: 'Correct', count: correctResponses.length, color: 'emerald' },
          { label: 'Wrong', count: wrongResponses.length, color: 'red' },
          { label: 'Skipped', count: skippedResponses.length, color: 'gray' },
        ].map(tab => (
          <button
            key={tab.label}
            onClick={() => setExpanded(null)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Question-by-question review */}
      <div className="space-y-2">
        {session.responses.map((r) => {
          const isOpen = expanded === r.question_id
          const icon = r.verdict === 'correct'
            ? <CheckCircle className="w-4 h-4 text-emerald-500" />
            : r.verdict === 'wrong'
              ? <XCircle className="w-4 h-4 text-red-500" />
              : <MinusCircle className="w-4 h-4 text-gray-400" />
          const bgColor = r.verdict === 'correct'
            ? 'border-emerald-200 dark:border-emerald-800'
            : r.verdict === 'wrong'
              ? 'border-red-200 dark:border-red-800'
              : 'border-gray-200 dark:border-gray-700'

          return (
            <div key={r.question_id} className={`bg-white dark:bg-gray-800 rounded-xl border ${bgColor} overflow-hidden`}>
              <button
                onClick={() => setExpanded(isOpen ? null : r.question_id)}
                className="w-full text-left p-4 flex items-start gap-3"
              >
                {icon}
                <div className="flex-1 min-w-0">
                  <RichText text={r.question_text} className="text-sm text-gray-800 dark:text-gray-300" />
                  <div className="mt-2">
                    <EslceQuestionMedia passage={r.passage} images={r.images} />
                  </div>
                  {r.verdict === 'wrong' && r.correct_option_text && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5">
                      Correct answer: {r.correct_option_label}. {r.correct_option_text}
                    </p>
                  )}
                  {r.verdict === 'wrong' && !r.correct_option_text && r.correct_option_label && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5">
                      Correct answer: {r.correct_option_label}
                    </p>
                  )}
                </div>
              </button>
            </div>
          )
        })}
      </div>

      {/* Bottom nav */}
      <div className="flex gap-3 mt-8">
        <button
          onClick={() => navigate('/eslce/progress')}
          className="flex-1 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium text-sm transition-colors"
        >
          Back to progress
        </button>
      </div>
    </div>
  )
}
