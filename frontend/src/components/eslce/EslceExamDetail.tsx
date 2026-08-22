import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../../config/api'

interface Exam {
  id: number; subject_id: number; subject_name: string; subject_code: string
  year: number; semester: string; type: string; title: string | null
  total_questions: number; total_marks: number; duration_minutes: number | null
  exam_type: string
}

export default function EslceExamDetail() {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()
  const [exam, setExam] = useState<Exam | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [mode, setMode] = useState<'exam' | 'practice'>('exam')

  useEffect(() => {
    const load = async () => {
      const res = await apiFetch(`/api/eslce/exams/${examId}`)
      if (res.ok) setExam(await res.json())
      setLoading(false)
    }
    load()
  }, [examId])

  const [error, setError] = useState<string | null>(null)

  const handleStart = async () => {
    if (!exam) return
    setStarting(true)
    setError(null)
    try {
      const res = await apiFetch('/api/eslce/exam/start', {
        method: 'POST',
        body: JSON.stringify({ exam_id: exam.id, mode, shuffle: true }),
      })
      if (res.ok) {
        const data = await res.json()
        if (mode === 'practice') {
          navigate('/eslce/practice', { state: data })
        } else {
          navigate('/eslce/session', { state: data })
        }
        return
      }
      let msg = `Could not start ${mode} (${res.status})`
      try {
        const errData = await res.json()
        if (errData?.detail) msg = errData.detail
      } catch { /* ignore */ }
      setError(msg)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error while starting')
    } finally {
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (!exam) {
    return <div className="text-center py-16 text-gray-500 dark:text-gray-400">Exam not found</div>
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate('/eslce')} className="text-indigo-600 hover:text-indigo-700 text-sm mb-4">
        &larr; Back to exams
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{exam.subject_name}</h1>
            {exam.exam_type === 'predicted' && (
              <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">
                Predicted
              </span>
            )}
          </div>
          <p className="text-indigo-100 mt-1">
            {exam.year} {exam.semester} &middot; {exam.type}
          </p>
        </div>

        <div className="p-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Questions', value: exam.total_questions },
              { label: 'Total Marks', value: exam.total_marks },
              { label: 'Duration', value: exam.duration_minutes ? `${exam.duration_minutes} min` : 'N/A' },
              { label: 'Type', value: exam.exam_type === 'past' ? 'Past Exam' : 'Predicted' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-gray-900 dark:text-white">{value}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
              </div>
            ))}
          </div>

          {/* Rules */}
          <div className="mb-8">
            <h3 className="font-semibold text-gray-800 dark:text-gray-300 mb-2">Instructions</h3>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>Read each question carefully before answering</li>
              <li>You can navigate between questions freely</li>
              {mode === 'exam' && <li>Answers are revealed only after submission</li>}
              {mode === 'practice' && <li>Get instant feedback after each answer</li>}
              <li>Your score and detailed review appear at the end</li>
            </ul>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setMode('exam')}
              className={`flex-1 py-3 rounded-xl font-medium border-2 transition-all ${
                mode === 'exam'
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-300'
              }`}
            >
              Exam Mode
            </button>
            <button
              onClick={() => setMode('practice')}
              className={`flex-1 py-3 rounded-xl font-medium border-2 transition-all ${
                mode === 'practice'
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-emerald-300'
              }`}
            >
              Practice Mode
            </button>
          </div>

          {/* Start button */}
          {error && (
            <div className="mb-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          <button
            onClick={handleStart}
            disabled={starting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            {starting ? 'Starting...' : mode === 'exam' ? 'Start Exam' : 'Start Practice'}
          </button>
        </div>
      </div>
    </div>
  )
}
