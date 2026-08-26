/**
 * Offline Quiz Page
 * Loads quiz questions from local SQLite and runs quiz sessions entirely offline.
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getQuizzes, recordQuizSession } from '../../services/offlineDb';
import QuizSession from './QuizSession';
import { ChemicalText } from '../../lib/chemical';

export default function OfflineQuizPage() {
  const { stbId, chapterId, sectionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const textbookTitle = (location.state as any)?.textbookTitle || '';
  const sectionTitle = (location.state as any)?.sectionTitle || '';

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);

  useEffect(() => {
    if (!stbId || !chapterId || !sectionId) return;
    setLoading(true);
    getQuizzes(stbId, parseInt(chapterId), sectionId).then(data => {
      setQuizzes(data);
      setLoading(false);
    });
  }, [stbId, chapterId, sectionId]);

  const handleQuizComplete = useCallback(async (result: any) => {
    setQuizResult(result);
    setQuizStarted(false);

    // Record locally
    if (stbId && chapterId && sectionId) {
      await recordQuizSession({
        stb_id: stbId,
        chapter_id: parseInt(chapterId),
        section_id: sectionId,
        session_type: 'practice',
        total_questions: result.totalQuestions,
        time_spent_seconds: 0,
        answers: result.results.map((r: any) => ({
          quiz_id: r.questionId,
          answer_text: r.yourAnswer,
          points: r.pointsEarned,
          is_correct: r.isCorrect,
        })),
      });
    }
  }, [stbId, chapterId, sectionId]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading quiz...</div>;
  }

  if (quizzes.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-4 text-center py-12">
        <p className="text-gray-500 text-lg">No quiz questions for this section.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-indigo-600 hover:underline">
          ← Go back
        </button>
      </div>
    );
  }

  // Quiz Result view
  if (quizResult) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Quiz Complete!</h2>
          <div className="text-5xl font-bold text-indigo-600 mb-2">
            {quizResult.percentage.toFixed(0)}%
          </div>
          <div className="text-gray-500 mb-4">
            {quizResult.correctCount} of {quizResult.totalQuestions} correct
          </div>
          <div className="text-sm text-gray-400">Time: {quizResult.timeSpent}</div>
        </div>

        {/* Question review */}
        <div className="space-y-3">
          {quizResult.results.map((r: any) => (
            <div
              key={r.questionId}
              className={`p-4 rounded-xl border-2 ${
                r.isCorrect
                  ? 'border-green-200 bg-green-50 dark:bg-green-900/10'
                  : 'border-red-200 bg-red-50 dark:bg-red-900/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm ${
                  r.isCorrect ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {r.isCorrect ? '✓' : '✗'}
                </span>
                <div className="flex-1">
                  <div className="text-sm text-gray-800 dark:text-gray-200">
                    <ChemicalText text={r.questionText} />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Your answer: <span className={r.isCorrect ? 'text-green-600' : 'text-red-600'}>{r.yourAnswerText}</span>
                  </div>
                  {!r.isCorrect && (
                    <div className="text-xs text-green-600 mt-1">
                      Correct: {r.correctAnswerText}
                    </div>
                  )}
                  {r.explanation && (
                    <div className="text-xs text-gray-400 mt-1 italic">
                      <ChemicalText text={r.explanation} />
                    </div>
                  )}
                </div>
                <span className="text-sm text-gray-500">{r.pointsEarned}/{r.maxPoints}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={() => { setQuizResult(null); setQuizStarted(false); }}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retake Quiz
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // Quiz selector / start view
  if (!quizStarted) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline text-sm mb-4">
          ← Back
        </button>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            Quiz: {sectionTitle || sectionId}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {textbookTitle}
          </p>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 mb-6">
            <div className="text-sm text-indigo-700 dark:text-indigo-300">
              <strong>{quizzes.length}</strong> questions available
            </div>
            <div className="text-xs text-indigo-500 mt-1">
              Answer each question and see your score at the end.
            </div>
          </div>
          <button
            onClick={() => setQuizStarted(true)}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  // Active quiz
  return (
    <div className="max-w-3xl mx-auto p-4">
      <QuizSession
        questions={quizzes.map(q => ({
          id: q.quiz_id,
          text: q.quiz_text,
          points: q.points,
          difficulty: q.difficulty,
          options: (q.options || []).map((o: any) => ({
            optionId: o.record_id,
            text: o.option_text,
            explanation: o.explanation,
            isCorrect: !!o.is_correct,
            label: o.option_label,
          })),
        }))}
        onComplete={handleQuizComplete}
      />
    </div>
  );
}
