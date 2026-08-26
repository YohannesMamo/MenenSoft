/**
 * Offline Study Page
 * Replaces the online StudyPage when in offline mode.
 * Loads all content from local SQLite database.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOfflineMode } from '../../context/OfflineContext';
import {
  getTextbooks, getChapters, getSections, getSectionContent,
  getBasicNotes, getPresentations, getQuizzes,
  markSectionCompleted, getSectionProgress,
} from '../../services/offlineDb';
import LatexText from '../LatexText';
import ChemicalText from '../ChemicalText';
import BasicNotesView from '../BasicNotesView';
import SlidesPlayer from '../SlidesPlayer';
import QuizSession from '../QuizSession';

type StudyMode = 'content' | 'notes' | 'slides' | 'quiz';

interface ChapterGroup {
  chapter_id: number;
  chapter_title: string;
  sections: any[];
}

export default function OfflineStudyPage() {
  const navigate = useNavigate();
  const { textbooks, gradeId } = useOfflineMode();

  const [selectedTextbook, setSelectedTextbook] = useState<string | null>(null);
  const [chapters, setChapters] = useState<ChapterGroup[]>([]);
  const [selectedSection, setSelectedSection] = useState<{
    stbId: string; chapterId: number; sectionId: string; title: string;
  } | null>(null);
  const [studyMode, setStudyMode] = useState<StudyMode>('content');
  const [sectionContent, setSectionContent] = useState<string>('');
  const [basicNotes, setBasicNotes] = useState<any>(null);
  const [presentations, setPresentations] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [sectionProgress, setSectionProgress] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  // Load chapters when textbook is selected
  useEffect(() => {
    if (!selectedTextbook) return;
    setLoading(true);
    Promise.all([
      getChapters(selectedTextbook),
      getSections(selectedTextbook),
      getSectionProgress(selectedTextbook),
    ]).then(([chaps, secs, prog]) => {
      const progressMap: Record<string, boolean> = {};
      prog.forEach((p: any) => {
        progressMap[`${p.chapter_id}-${p.section_id}`] = !!p.is_completed;
      });
      setSectionProgress(progressMap);

      const groups: ChapterGroup[] = chaps.map((c: any) => ({
        chapter_id: c.chapter_id,
        chapter_title: c.chapter_title,
        sections: secs.filter((s: any) => s.chapter_id === c.chapter_id).map((s: any) => ({
          section_id: s.section_id,
          section_title: s.section_title,
        })),
      }));
      setChapters(groups);
      setLoading(false);
    }).catch(e => {
      console.error(e);
      setLoading(false);
    });
  }, [selectedTextbook]);

  // Load section data when section is selected
  useEffect(() => {
    if (!selectedSection) return;
    setLoading(true);
    Promise.all([
      getSectionContent(selectedSection.stbId, selectedSection.chapterId, selectedSection.sectionId),
      getBasicNotes(selectedSection.stbId, selectedSection.chapterId, selectedSection.sectionId),
      getPresentations(selectedSection.stbId, selectedSection.chapterId, selectedSection.sectionId),
      getQuizzes(selectedSection.stbId, selectedSection.chapterId, selectedSection.sectionId),
    ]).then(([content, notes, pres, qzs]) => {
      setSectionContent(content || '');
      setBasicNotes(notes);
      setPresentations(pres);
      setQuizzes(qzs);
      setLoading(false);
    }).catch(e => {
      console.error(e);
      setLoading(false);
    });
  }, [selectedSection]);

  const handleMarkCompleted = useCallback(async () => {
    if (!selectedSection) return;
    await markSectionCompleted(selectedSection.stbId, selectedSection.chapterId, selectedSection.sectionId);
    setSectionProgress(prev => ({
      ...prev,
      [`${selectedSection.chapterId}-${selectedSection.sectionId}`]: true,
    }));
  }, [selectedSection]);

  // Textbook selection view
  if (!selectedTextbook) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
          📚 Study (Offline)
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Grade 12 — Select a textbook
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {textbooks.map((tb: any) => (
            <button
              key={tb.stb_id}
              onClick={() => setSelectedTextbook(tb.stb_id)}
              className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-md transition text-left"
            >
              <div className="font-semibold text-gray-800 dark:text-white">{tb.title}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {tb.chapter_count} chapters · {tb.section_count} sections
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Section view
  if (selectedSection) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setSelectedSection(null)} className="text-blue-600 hover:underline text-sm">
            ← Back to chapters
          </button>
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
          {selectedSection.title}
        </h2>

        {/* Mode tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {[
            { key: 'content', label: '📖 Content' },
            { key: 'notes', label: '📝 Notes' },
            { key: 'slides', label: '🎞️ Slides' },
            { key: 'quiz', label: `❓ Quiz (${quizzes.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStudyMode(tab.key as StudyMode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                studyMode === tab.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : (
          <>
            {/* Content mode */}
            {studyMode === 'content' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
                {sectionContent ? (
                  <div className="prose dark:prose-invert max-w-none">
                    <ChemicalText text={sectionContent} />
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No content available for this section.</p>
                )}
                <button
                  onClick={handleMarkCompleted}
                  className={`mt-6 px-4 py-2 rounded-lg text-sm font-medium ${
                    sectionProgress[`${selectedSection.chapterId}-${selectedSection.sectionId}`]
                      ? 'bg-green-100 text-green-700'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {sectionProgress[`${selectedSection.chapterId}-${selectedSection.sectionId}`]
                    ? '✓ Completed'
                    : 'Mark as Completed'}
                </button>
              </div>
            )}

            {/* Notes mode */}
            {studyMode === 'notes' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
                {basicNotes ? (
                  <BasicNotesView notes={basicNotes} />
                ) : (
                  <p className="text-gray-500 italic">No notes available for this section.</p>
                )}
              </div>
            )}

            {/* Slides mode */}
            {studyMode === 'slides' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
                {presentations.length > 0 ? (
                  <SlidesPlayer slides={presentations} />
                ) : (
                  <p className="text-gray-500 italic">No slides available for this section.</p>
                )}
              </div>
            )}

            {/* Quiz mode */}
            {studyMode === 'quiz' && (
              <div>
                {quizzes.length > 0 ? (
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
                      })),
                    }))}
                    onComplete={(result) => {
                      console.log('Quiz result:', result);
                    }}
                  />
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow text-center">
                    <p className="text-gray-500 italic">No quiz questions for this section.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Chapter list view
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setSelectedTextbook(null)} className="text-blue-600 hover:underline text-sm">
          ← Back to textbooks
        </button>
      </div>
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
        {textbooks.find((t: any) => t.stb_id === selectedTextbook)?.title}
      </h2>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading chapters...</div>
      ) : (
        <div className="space-y-4">
          {chapters.map(ch => (
            <div key={ch.chapter_id} className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                <h3 className="font-semibold text-gray-800 dark:text-white">
                  Chapter {ch.chapter_id}: {ch.chapter_title}
                </h3>
              </div>
              <div className="divide-y dark:divide-gray-700">
                {ch.sections.map(sec => {
                  const isCompleted = sectionProgress[`${ch.chapter_id}-${sec.section_id}`];
                  return (
                    <button
                      key={sec.section_id}
                      onClick={() => setSelectedSection({
                        stbId: selectedTextbook,
                        chapterId: ch.chapter_id,
                        sectionId: sec.section_id,
                        title: `${ch.chapter_title} > ${sec.section_title}`,
                      })}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left"
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {sec.section_id}: {sec.section_title}
                      </span>
                      {isCompleted && <span className="text-green-500 text-sm">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
