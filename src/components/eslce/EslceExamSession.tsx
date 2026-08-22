import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { apiFetch } from '../../config/api'
import { RichText } from '../../lib/content'
import EslceQuestionMedia from './EslceQuestionMedia'

interface Option { id: number; label: string; text: string }
interface Question {
  id: number; code: string; text: string; marks: number
  question_number: number; options: Option[]
  passage?: any; images?: any[]
}

export default function EslceExamSession() {
  const navigate = useNavigate()
  const location = useLocation()
  const data = location.state as any

  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [flags, setFlags] = useState<Set<number>>(new Set())
  const [showSubmit, setShowSubmit] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!data?.questions) { navigate('/eslce'); return }
    setQuestions(data.questions)
  }, [data, navigate])

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const q = questions[currentIndex]
  const answered = q ? Object.keys(answers).length : 0
  const flagged = flags.size

  const selectOption = (questionId: number, optionId: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }))
  }

  const toggleFlag = (questionId: number) => {
    setFlags(prev => {
      const next = new Set(prev)
      if (next.has(questionId)) next.delete(questionId)
      else next.add(questionId)
      return next
    })
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await apiFetch('/api/eslce/exam/submit', {
        method: 'POST',
        body: JSON.stringify({
          session_id: data.session_id,
          answers,
          time_spent_ms: elapsed * 1000,
        }),
      })
      if (res.ok) {
        const result = await res.json()
        navigate('/eslce/results', { state: result })
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!q) return null

  return (
    <div className="max-w-4xl mx-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 mb-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <span className="font-bold text-indigo-600 dark:text-indigo-400">{data?.exam?.subject_name}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {currentIndex + 1} / {questions.length}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500 dark:text-gray-400">Flagged: {flagged}</span>
          <span className="font-mono text-gray-700 dark:text-gray-300">{formatTime(elapsed)}</span>
        </div>
      </div>

      {/* Question navigator */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {questions.map((qq, i) => {
          const isAnswered = answers[qq.id] !== undefined
          const isFlagged = flags.has(qq.id)
          const isCurrent = i === currentIndex
          return (
            <button
              key={qq.id}
              onClick={() => setCurrentIndex(i)}
              className={`w-8 h-8 rounded-lg text-xs font-medium border transition-colors ${
                isCurrent
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : isFlagged
                    ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400'
                    : isAnswered
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400'
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {qq.question_number || i + 1}
            </button>
          )
        })}
      </div>

      {/* Question card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Question {q.question_number || currentIndex + 1} &middot; {q.marks} mark{q.marks !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => toggleFlag(q.id)}
            className={`text-sm px-3 py-1 rounded-lg border transition-colors ${
              flags.has(q.id)
                ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400'
                : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:text-amber-500 dark:hover:text-amber-400'
            }`}
          >
            {flags.has(q.id) ? 'Unflag' : 'Flag'}
          </button>
        </div>

        <div className="text-gray-900 dark:text-white mb-6">
          <RichText text={q.text} />
        </div>

        <EslceQuestionMedia passage={q.passage} images={q.images} />

        <div className="space-y-2">
          {q.options.map(opt => {
            const selected = answers[q.id] === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => selectOption(q.id, opt.id)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                  selected
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-400 dark:border-indigo-500 text-indigo-800 dark:text-indigo-200'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="font-medium mr-2">{opt.label}.</span>
                <RichText text={opt.text} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-30"
        >
          Previous
        </button>
        <div className="flex gap-2">
          {currentIndex === questions.length - 1 ? (
            <button
              onClick={() => setShowSubmit(true)}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
            >
              Submit Exam
            </button>
          ) : (
            <button
              onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
            >
              Next
            </button>
          )}
        </div>
      </div>

      {/* Submit confirmation modal */}
      {showSubmit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Submit Exam?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {answered} of {questions.length} answered &middot; {flagged} flagged
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmit(false)}
                className="flex-1 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Grading...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
