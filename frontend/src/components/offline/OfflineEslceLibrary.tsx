/**
 * Offline ESLCE Exam Library
 * Lists ESLCE exams from local SQLite. Select exam -> start practice/exam mode.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEslceSubjects, getEslceExams, getEslceQuestions } from '../../services/offlineDb';

export default function OfflineEslceLibrary() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'past' | 'predicted'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getEslceSubjects(), getEslceExams()]).then(([subjs, exs]) => {
      setSubjects(subjs);
      setExams(exs);
      setLoading(false);
    });
  }, []);

  const filteredExams = exams.filter(e => {
    if (selectedSubject && e.subject_id !== selectedSubject) return false;
    if (filter === 'past' && e.exam_type !== 'past') return false;
    if (filter === 'predicted' && e.exam_type !== 'predicted') return false;
    return true;
  });

  // Group by year
  const grouped: Record<number, any[]> = {};
  filteredExams.forEach(e => {
    if (!grouped[e.year]) grouped[e.year] = [];
    grouped[e.year].push(e);
  });
  const sortedYears = Object.keys(grouped).map(Number).sort((a, b) => b - a);

  const handleStartExam = async (exam: any, mode: 'exam' | 'practice') => {
    setLoading(true);
    const questions = await getEslceQuestions(exam.id);
    navigate('/offline/eslce/session', {
      state: {
        questions: questions.map((q: any) => ({
          id: q.id,
          code: q.code,
          text: q.question_text,
          marks: q.marks,
          question_number: q.question_number,
          options: q.options.map((o: any) => ({
            id: o.id,
            label: o.label,
            text: o.option_text,
          })),
          passage: q.passage || null,
          images: q.images || [],
        })),
        exam: { id: exam.id, subject_name: exam.subject_name, title: exam.title, year: exam.year, semester: exam.semester },
        mode,
      },
    });
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading ESLCE exams...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
        🎓 ESLCE Exams (Offline)
      </h1>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {(['all', 'past', 'predicted'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Subject pills */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedSubject(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
            selectedSubject === null
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          All Subjects
        </button>
        {subjects.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedSubject(s.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              selectedSubject === s.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Exam list grouped by year */}
      {sortedYears.map(year => (
        <div key={year} className="mb-6">
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-3">{year}</h3>
          <div className="space-y-2">
            {grouped[year].map(exam => (
              <div
                key={exam.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-gray-800 dark:text-white">
                      {exam.subject_name} — {exam.semester}
                    </div>
                    {exam.title && (
                      <div className="text-sm text-gray-500">{exam.title}</div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      {exam.total_questions} questions · {exam.exam_type}
                      {exam.duration_minutes && ` · ${exam.duration_minutes} min`}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleStartExam(exam, 'practice')}
                    className="px-4 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-200"
                  >
                    Practice
                  </button>
                  <button
                    onClick={() => handleStartExam(exam, 'exam')}
                    className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                  >
                    Exam Mode
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {sortedYears.length === 0 && (
        <p className="text-gray-500 text-center py-12">No exams found for the selected filters.</p>
      )}
    </div>
  );
}
