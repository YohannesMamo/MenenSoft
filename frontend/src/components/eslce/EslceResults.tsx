import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { RichText } from '../../lib/content'
import { ChemicalText } from '../../lib/chemical'
import EslceQuestionMedia from './EslceQuestionMedia'

export default function EslceResults() {
  const navigate = useNavigate()
  const location = useLocation()
  const result = location.state as any
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null)

  if (!result) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 dark:text-gray-400">No results to display</p>
        <button onClick={() => navigate('/eslce')} className="mt-4 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
          Back to exams
        </button>
      </div>
    )
  }

  const pct = result.percentage ?? 0
  const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 50 ? 'D' : 'F'
  const gradeColor = pct >= 70 ? 'text-emerald-600 dark:text-emerald-400' : pct >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
  const exam = result.exam

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6 text-center">
        <div className={`text-6xl font-bold mb-2 ${gradeColor}`}>{grade}</div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{pct}%</div>
        <div className="text-gray-500 dark:text-gray-400">
          {exam?.subject_name} &middot; {exam?.year} {exam?.semester}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Correct', value: result.correct_count, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' },
          { label: 'Wrong', value: result.wrong_count, color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30' },
          { label: 'Unanswered', value: result.unanswered_count, color: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl p-4 text-center ${color}`}>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm">{label}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => navigate('/eslce')}
          className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
        >
          Back to exams
        </button>
        {result.mode === 'exam' && result.graded_questions?.some((q: any) => q.verdict === 'wrong') && (
          <button
            onClick={() => navigate(`/eslce/${exam?.id}`, { state: { retryWrong: true } })}
            className="flex-1 py-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-900/40"
          >
            Practice wrong answers
          </button>
        )}
      </div>

      {/* Question-by-question review */}
      {result.graded_questions && (
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-gray-300 mb-3">Question Review</h3>
          <div className="space-y-2">
            {result.graded_questions.map((gq: any) => {
              const isOpen = expandedQuestion === gq.question_id
              const verdictColor = gq.verdict === 'correct'
                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
                : gq.verdict === 'wrong'
                  ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30'
                  : 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900'

              return (
                <div key={gq.question_id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedQuestion(isOpen ? null : gq.question_id)}
                    className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Q{gq.question_number || '?'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${verdictColor}`}>
                        {gq.verdict}
                      </span>
                    </div>
                    <span className="text-gray-400 dark:text-gray-500 text-sm">{isOpen ? '&uarr;' : '&darr;'}</span>
                  </button>

                  {isOpen && (
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                      <div className="text-sm text-gray-800 dark:text-gray-300 mb-3">
                        <RichText text={gq.text} />
                      </div>
                      <EslceQuestionMedia passage={gq.passage} images={gq.images} />
                      <div className="space-y-1 mb-3 mt-3">
                        {gq.options?.map((opt: any) => (
                          <div
                            key={opt.id}
                            className={`text-sm p-2 rounded-lg ${
                              opt.id === gq.correct_option_id
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200'
                                : opt.id === gq.selected_option_id && gq.verdict === 'wrong'
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            <span className="font-medium">{opt.label}.</span> <RichText text={opt.text} />
                            {opt.id === gq.correct_option_id && <span className="ml-1 text-emerald-600 dark:text-emerald-400">(Correct)</span>}
                          </div>
                        ))}
                      </div>
                      {gq.wrong_explanation && (
                        <p className="text-sm text-red-600 dark:text-red-400 mb-1">
                          <strong>Incorrect Because:</strong> <ChemicalText text={gq.wrong_explanation} />
                        </p>
                      )}
                      {gq.correct_explanation && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Explanation:</strong> <ChemicalText text={gq.correct_explanation} />
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
