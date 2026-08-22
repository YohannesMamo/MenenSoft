import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { apiFetch } from '../../config/api'
import { ChemicalText } from '../../lib/chemical'
import { RichText } from '../../lib/content'
import EslceQuestionMedia from './EslceQuestionMedia'

interface Option { id: number; label: string; text: string }
interface Question {
  id: number; code: string; text: string; marks: number
  question_number: number; options: Option[]
  passage?: any; images?: any[]
}

export default function EslcePracticeMode() {
  const navigate = useNavigate()
  const location = useLocation()
  const data = location.state as any

  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [feedback, setFeedback] = useState<any>(null)
  const [score, setScore] = useState({ correct: 0, wrong: 0 })
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!data?.questions) { navigate('/eslce'); return }
    setQuestions(data.questions)
  }, [data, navigate])

  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const q = questions[currentIndex]

  const handleSubmitAnswer = async () => {
    if (!q || selectedOption === null) return
    setSubmitted(true)
    try {
      const res = await apiFetch('/api/eslce/practice/answer', {
        method: 'POST',
        body: JSON.stringify({
          session_id: data.session_id,
          question_id: q.id,
          selected_option_id: selectedOption,
        }),
      })
      if (res.ok) {
        const fb = await res.json()
        setFeedback(fb)
        if (fb.is_correct) setScore(s => ({ ...s, correct: s.correct + 1 }))
        else setScore(s => ({ ...s, wrong: s.wrong + 1 }))
      }
    } catch { setSubmitted(false) }
  }

  const handleNext = () => {
    setSelectedOption(null)
    setSubmitted(false)
    setFeedback(null)
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1)
    } else {
      apiFetch('/api/eslce/practice/complete', {
        method: 'POST',
        body: JSON.stringify({ session_id: data.session_id, time_spent_ms: elapsed * 1000 }),
      }).then(() => {
        navigate('/eslce/results', {
          state: {
            session_id: data.session_id,
            exam: data?.exam,
            mode: 'practice',
            total_questions: questions.length,
            correct_count: score.correct + (feedback?.is_correct ? 0 : 0),
            wrong_count: score.wrong,
            unanswered_count: 0,
            percentage: Math.round((score.correct + (feedback?.is_correct ? 1 : 0)) / questions.length * 100),
          },
        })
      })
    }
  }

  if (!q) return null

  const correctOpt = q.options.find(o => o.id === feedback?.correct_option_id)

  return (
    <div className="max-w-3xl mx-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 mb-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <span className="font-bold text-emerald-600 dark:text-emerald-400">Practice</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{currentIndex + 1} / {questions.length}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-emerald-600 dark:text-emerald-400">{score.correct} correct</span>
          <span className="text-red-500 dark:text-red-400">{score.wrong} wrong</span>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Question {q.question_number || currentIndex + 1} &middot; {q.marks} mark{q.marks !== 1 ? 's' : ''}
        </div>
        <div className="text-gray-900 dark:text-white mb-6">
          <RichText text={q.text} />
        </div>

        <EslceQuestionMedia passage={q.passage} images={q.images} />

        <div className="space-y-2">
          {q.options.map(opt => {
            const selected = selectedOption === opt.id
            const isCorrect = feedback && opt.id === feedback.correct_option_id
            const isWrong = feedback && selected && !feedback.is_correct

            return (
              <button
                key={opt.id}
                onClick={() => !submitted && setSelectedOption(opt.id)}
                disabled={submitted}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                  isCorrect
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 dark:border-emerald-500 text-emerald-800 dark:text-emerald-200'
                    : isWrong
                      ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400'
                      : selected
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-400 dark:border-indigo-500 text-indigo-800 dark:text-indigo-200'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="font-medium mr-2">{opt.label}.</span>
                <RichText text={opt.text} />
                {isCorrect && <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-medium">(Correct)</span>}
                {isWrong && <span className="ml-2 text-red-500 dark:text-red-400 font-medium">(Wrong)</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`rounded-xl p-4 mb-6 border ${feedback.is_correct ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700'}`}>
          <p className={`font-semibold mb-1 ${feedback.is_correct ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
            {feedback.is_correct ? 'Correct!' : 'Not quite.'}
          </p>
          {!feedback.is_correct && feedback.wrong_explanation && (
            <p className="text-sm text-red-600 dark:text-red-400 mb-1">
              <strong>Incorrect Because:</strong> <ChemicalText text={feedback.wrong_explanation} />
            </p>
          )}
          {!feedback.is_correct && correctOpt && (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              Correct answer: {correctOpt.label}. <RichText text={correctOpt.text} />
            </p>
          )}
          {feedback.correct_explanation && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              <strong>Explanation:</strong> <ChemicalText text={feedback.correct_explanation} />
            </p>
          )}
        </div>
      )}

      {/* Action */}
      <div className="flex justify-end">
        {!submitted ? (
          <button
            onClick={handleSubmitAnswer}
            disabled={selectedOption === null}
            className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-30"
          >
            Check Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
          >
            {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish'}
          </button>
        )}
      </div>
    </div>
  )
}
