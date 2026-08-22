import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../config/api'
import { Beaker, BookOpen } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

interface Subject { id: number; name: string; code: string }
interface Exam {
  id: number; subject_id: number; subject_name: string; subject_code: string
  year: number; semester: string; type: string; title: string | null
  total_questions: number; total_marks: number; exam_type: string
}

type ExamFilter = 'all' | 'past' | 'predicted'

export default function EslceExamLibrary() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null)
  const [examFilter, setExamFilter] = useState<ExamFilter>('all')
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)

  useEffect(() => {
    const checkAccess = async () => {
      const isPremium = user?.subscriptionStatus === 'Premium'
      if (!isPremium) { setAccessDenied(true); setLoading(false); return }
      try {
        const token = localStorage.getItem('token')
        const gradeRes = await fetch(`${API_BASE}/api/study/student-grade`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        })
        const gradeData = gradeRes.ok ? await gradeRes.json() : null
        if (gradeData?.grade !== 'HIG12A') { setAccessDenied(true); setLoading(false); return }
      } catch (e) {
        console.error('Failed to verify grade for ESLCE access:', e)
        setAccessDenied(true); setLoading(false); return
      }
      setLoading(false)
    }
    checkAccess()
  }, [user])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [subRes, examRes] = await Promise.all([
        apiFetch('/api/eslce/subjects'),
        apiFetch('/api/eslce/exams'),
      ])
      if (subRes.ok) setSubjects(await subRes.json())
      if (examRes.ok) setExams(await examRes.json())
      setLoading(false)
    }
    load()
  }, [])

  const filtered = exams.filter(e => {
    if (selectedSubject && e.subject_id !== selectedSubject) return false
    if (examFilter !== 'all' && e.exam_type !== examFilter) return false
    return true
  })
  const years = [...new Set(filtered.map(e => e.year))].sort((a, b) => b - a)

  const pastCount = exams.filter(e => e.exam_type === 'past').length
  const predictedCount = exams.filter(e => e.exam_type === 'predicted').length

  useEffect(() => {
    if (accessDenied) navigate('/dashboard', { replace: true })
  }, [accessDenied, navigate])

  if (accessDenied) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">ESLCE Exams</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Practice with real national exam questions and predicted sets</p>
        </div>
        <button onClick={() => navigate('/eslce/progress')} className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium mb-1">
          View Progress &rarr;
        </button>
      </div>

      {/* Past / Predicted filter tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setExamFilter('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            examFilter === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({exams.length})
        </button>
        <button
          onClick={() => setExamFilter('past')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            examFilter === 'past'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Past ({pastCount})
        </button>
        <button
          onClick={() => setExamFilter('predicted')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            examFilter === 'predicted'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Beaker className="w-4 h-4" />
          Predicted ({predictedCount})
        </button>
      </div>

      {/* Subject pills */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-thin">
        <button
          onClick={() => setSelectedSubject(null)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedSubject === null
              ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              All ({filtered.length})
        </button>
        {subjects.map(s => {
          const count = filtered.filter(e => e.subject_id === s.id).length
          if (count === 0) return null
          return (
            <button
              key={s.id}
              onClick={() => setSelectedSubject(s.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedSubject === s.id
                  ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {s.name} ({count})
            </button>
          )
        })}
      </div>

      {/* Year grid */}
      {years.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">No exams found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {years.map(year => {
            const yearExams = filtered.filter(e => e.year === year)
            return (
              <div key={year} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{year}</h3>
                  <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-medium">
                    {yearExams.length} exam{yearExams.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-2">
                  {yearExams.map(exam => (
                    <button
                      key={exam.id}
                      onClick={() => navigate(`/eslce/${exam.id}`)}
                      className="w-full text-left p-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800 dark:text-gray-300 group-hover:text-indigo-600 truncate">
                              {exam.subject_name}
                            </span>
                            {exam.exam_type === 'predicted' ? (
                              <span className="flex-shrink-0 text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-medium">
                                Predicted
                              </span>
                            ) : (
                              <span className="flex-shrink-0 text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-medium">
                                Past
                              </span>
                            )}
                          </div>
                          <span className="text-gray-400 text-sm">{exam.semester}</span>
                        </div>
                        <span className="text-xs text-gray-400 group-hover:text-indigo-500 flex-shrink-0 ml-2">
                          {exam.total_questions}Q &rarr;
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
