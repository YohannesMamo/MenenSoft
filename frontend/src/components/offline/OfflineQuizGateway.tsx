/**
 * Offline Quiz Gateway
 * Textbook -> Chapter -> Section selection for quizzes using local SQLite.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOfflineMode } from '../../context/OfflineContext';
import { getQuizTextbooks, getQuizChapters, getQuizSections } from '../../services/offlineDb';

export default function OfflineQuizGateway() {
  const navigate = useNavigate();
  const { } = useOfflineMode();
  const [step, setStep] = useState<'textbooks' | 'chapters' | 'sections'>('textbooks');
  const [textbooks, setTextbooks] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [selectedTextbook, setSelectedTextbook] = useState<string>('');
  const [selectedTextbookTitle, setSelectedTextbookTitle] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getQuizTextbooks().then(data => {
      setTextbooks(data);
      setLoading(false);
    });
  }, []);

  const handleTextbookSelect = async (stbId: string, title: string) => {
    setSelectedTextbook(stbId);
    setSelectedTextbookTitle(title);
    setLoading(true);
    const chaps = await getQuizChapters(stbId);
    setChapters(chaps);
    setStep('chapters');
    setLoading(false);
  };

  const handleChapterSelect = async (chapterId: number) => {
    setSelectedChapter(chapterId);
    setLoading(true);
    const secs = await getQuizSections(selectedTextbook, chapterId);
    setSections(secs);
    setStep('sections');
    setLoading(false);
  };

  const handleSectionSelect = (sectionId: string) => {
    navigate(`/offline/quiz/${selectedTextbook}/${selectedChapter}/${sectionId}`, {
      state: {
        textbookTitle: selectedTextbookTitle,
        sectionTitle: sections.find(s => s.section_id === sectionId)?.section_title,
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <button onClick={() => { setStep('textbooks'); setSelectedTextbook(''); }} className="hover:text-indigo-600">
          Quiz
        </button>
        {step !== 'textbooks' && (
          <>
            <span>/</span>
            <button onClick={() => setStep('chapters')} className="hover:text-indigo-600">
              {selectedTextbookTitle}
            </button>
          </>
        )}
        {step === 'sections' && (
          <>
            <span>/</span>
            <span className="text-gray-700 dark:text-gray-300">
              Ch {selectedChapter}
            </span>
          </>
        )}
      </div>

      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
        ❓ Quizzes (Offline)
      </h1>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <>
          {/* Textbooks */}
          {step === 'textbooks' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {textbooks.map((tb: any) => (
                <button
                  key={tb.stb_id}
                  onClick={() => handleTextbookSelect(tb.stb_id, tb.textbook_title)}
                  className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-md transition text-left"
                >
                  <div className="font-semibold text-gray-800 dark:text-white">{tb.textbook_title}</div>
                  <div className="text-sm text-gray-500 mt-1">{tb.subject_name}</div>
                  <div className="text-sm text-indigo-600 mt-2">{tb.total} quiz questions</div>
                </button>
              ))}
            </div>
          )}

          {/* Chapters */}
          {step === 'chapters' && (
            <div className="space-y-2">
              {chapters.filter((c: any) => c.total > 0).map((ch: any) => (
                <button
                  key={ch.chapter_id}
                  onClick={() => handleChapterSelect(ch.chapter_id)}
                  className="w-full p-4 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-md transition text-left flex justify-between items-center"
                >
                  <div>
                    <span className="font-semibold text-gray-800 dark:text-white">
                      Chapter {ch.chapter_id}: {ch.chapter_title}
                    </span>
                  </div>
                  <span className="text-sm text-indigo-600">{ch.total} questions</span>
                </button>
              ))}
            </div>
          )}

          {/* Sections */}
          {step === 'sections' && (
            <div className="space-y-2">
              {sections.filter((s: any) => s.question_count > 0).map((sec: any) => (
                <button
                  key={sec.section_id}
                  onClick={() => handleSectionSelect(sec.section_id)}
                  className="w-full p-4 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-md transition text-left flex justify-between items-center"
                >
                  <div>
                    <span className="font-semibold text-gray-800 dark:text-white">
                      {sec.section_id}: {sec.section_title}
                    </span>
                    {sec.is_completed === 1 && (
                      <span className="ml-2 text-green-500 text-sm">✓ Completed</span>
                    )}
                  </div>
                  <span className="text-sm text-indigo-600">{sec.question_count} questions</span>
                </button>
              ))}
              {sections.filter((s: any) => s.question_count > 0).length === 0 && (
                <p className="text-gray-500 text-center py-8">No quiz sections available.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
