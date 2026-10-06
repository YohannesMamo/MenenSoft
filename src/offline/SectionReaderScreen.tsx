import React, { useState, useEffect, useRef } from 'react';
import { sqliteDb } from './db';
import type { Highlight, StudyNote } from './types';
import { RichText } from '../lib/content';
import SlidesPlayer from '../components/SlidesPlayer';
import PdfViewer, { type PdfViewerRef } from '../components/PdfViewer';
import { pdfFileNameFor, pdfUrlFor } from './pdfAssets';
import {
  ArrowLeft,
  Bookmark as BookmarkIcon,
  Highlighter,
  CheckCircle,
  BrainCircuit,
  FileText,
  MonitorPlay,
  StickyNote,
  Trash2,
  Plus,
  Sparkles,
  RotateCcw,
  Clock,
  AlertTriangle,
  BookOpen,
  FileSearch
} from 'lucide-react';

interface Props {
  stbId: string;
  chapterId: number;
  sectionId: string;
  onBack: () => void;
  onTakeQuiz: (stbId: string, chapterId: number, sectionId: string) => void;
}

export const SectionReaderScreen: React.FC<Props> = ({
  stbId,
  chapterId,
  sectionId,
  onBack,
  onTakeQuiz
}) => {
  const textbook = sqliteDb.getTextbook(stbId);
  const section = sqliteDb.getSection(stbId, chapterId, sectionId);
  const basicNotes = sqliteDb.getBasicNotes(stbId, chapterId, sectionId);
  const slides = sqliteDb.getPresentations(stbId, chapterId, sectionId);
  const pdfUrl = pdfUrlFor(stbId);
  const pdfName = pdfFileNameFor(stbId);

  const [isBookmarked, setIsBookmarked] = useState(sqliteDb.isBookmarked(stbId, chapterId, sectionId));
  const [progress, setProgress] = useState(sqliteDb.getSectionProgress(stbId, chapterId, sectionId));
  const [highlights, setHighlights] = useState<Highlight[]>(sqliteDb.getHighlights(stbId, chapterId, sectionId));
  const [notes, setNotes] = useState<StudyNote[]>(sqliteDb.getStudyNotes(stbId, chapterId, sectionId));

  // Study evaluation tracking: record access and re-read on mount
  useEffect(() => {
    sqliteDb.recordSectionAccess(stbId, chapterId, sectionId, 45);
    setProgress(sqliteDb.getSectionProgress(stbId, chapterId, sectionId));
  }, [stbId, chapterId, sectionId]);

  const quizStats = sqliteDb.getSectionQuizStats(stbId, chapterId, sectionId);

  const [activeTab, setActiveTab] = useState<'pdf' | 'slides' | 'summary' | 'notes'>('pdf');
  const [pdfSubview, setPdfSubview] = useState<'pdf' | 'text'>('pdf');
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const pdfRef = useRef<PdfViewerRef>(null);
  const [selectedHighlightColor, setSelectedHighlightColor] = useState<'yellow' | 'emerald' | 'sky' | 'rose'>('yellow');
  const [highlightInput, setHighlightInput] = useState('');
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  const isCompleted = progress?.is_completed === 1;

  const jumpToSectionPage = () => {
    if (!section?.start_page || !pdfRef.current || pdfPageCount === 0) return;
    const target = Math.min(Math.max(section.start_page - 1, 0), Math.max(pdfPageCount - 1, 0));
    pdfRef.current.jumpToPage(target);
  };

  const handlePdfLoad = (pageCount: number) => {
    setPdfPageCount(pageCount);
    setPdfError(null);
    setTimeout(jumpToSectionPage, 250);
  };

  useEffect(() => {
    setPdfSubview('pdf');
    setPdfError(null);
  }, [sectionId]);

  const handleToggleBookmark = () => {
    const newState = sqliteDb.toggleBookmark(stbId, chapterId, sectionId);
    setIsBookmarked(newState);
  };

  const handleToggleCompleted = () => {
    const nextStatus = !isCompleted;
    sqliteDb.markSectionCompleted(stbId, chapterId, sectionId, nextStatus);
    setProgress(sqliteDb.getSectionProgress(stbId, chapterId, sectionId));
  };

  const handleAddHighlight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!highlightInput.trim()) return;

    const newHl = sqliteDb.addHighlight({
      stb_id: stbId,
      chapter_id: chapterId,
      section_id: sectionId,
      text_content: highlightInput.trim(),
      highlight_color: selectedHighlightColor,
      note: 'Added from section reader'
    });

    setHighlights([...highlights, newHl]);
    setHighlightInput('');
    setIsHighlighting(false);
  };

  const handleDeleteHighlight = (id: string) => {
    sqliteDb.deleteHighlight(id);
    setHighlights(highlights.filter(h => h.highlight_id !== id));
  };

  const handleAddStudyNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const note = sqliteDb.addStudyNote(stbId, chapterId, sectionId, newNoteText.trim());
    setNotes([...notes, note]);
    setNewNoteText('');
  };

  if (!section) {
    return (
      <div className="p-6 text-center text-slate-400">
        <p>Section not found in bundled database.</p>
        <button onClick={onBack} className="mt-3 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs">
          Return to chapters
        </button>
      </div>
    );
  }

  const highlightColorMap = {
    yellow: 'bg-amber-400',
    emerald: 'bg-emerald-400',
    sky: 'bg-sky-400',
    rose: 'bg-rose-400'
  };

  const highlightBorderMap = {
    yellow: 'border-l-amber-400 bg-amber-400/10 text-amber-200',
    emerald: 'border-l-emerald-400 bg-emerald-400/10 text-emerald-200',
    sky: 'border-l-sky-400 bg-sky-400/10 text-sky-200',
    rose: 'border-l-rose-400 bg-rose-400/10 text-rose-200'
  };

  const tabButton = (value: 'pdf' | 'slides' | 'summary' | 'notes', label: string, icon: React.ReactNode, iconColor: string) => (
    <button
      onClick={() => setActiveTab(value)}
      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
        activeTab === value ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
      }`}
    >
      <span className={activeTab === value ? '' : iconColor}>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div className="space-y-4 pb-12">
      {/* Navigation Top Bar */}
      <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md py-2 border-b border-slate-800 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Chapters</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Bookmark Toggle */}
          <button
            onClick={handleToggleBookmark}
            title={isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isBookmarked
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <BookmarkIcon className={`w-4 h-4 ${isBookmarked ? 'fill-amber-400' : ''}`} />
          </button>

          {/* Mark Completed Toggle */}
          <button
            onClick={handleToggleCompleted}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
              isCompleted
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <CheckCircle className={`w-3.5 h-3.5 ${isCompleted ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>{isCompleted ? 'Completed' : 'Mark Done'}</span>
          </button>
        </div>
      </div>

      {/* Title & Metadata Banner */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-semibold uppercase tracking-wider">
          <span>{textbook?.title.replace('Student Textbook', '')}</span>
          <span>·</span>
          <span>Chapter {chapterId}</span>
        </div>
        <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
          {section.section_id}: {section.section_title}
        </h2>
        {section.start_page && (
          <p className="text-[11px] text-slate-400">
            Official Textbook Pages {section.start_page} – {section.end_page}
          </p>
        )}

        {/* Study Evaluation Layer Metrics */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-700/60 text-[11px]">
          <span className="flex items-center gap-1 text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
            <RotateCcw className="w-3 h-3" />
            <span>Re-read: {progress?.re_read_count || 1} time(s)</span>
          </span>

          <span className="flex items-center gap-1 text-slate-300 bg-slate-700/40 px-2 py-0.5 rounded-md">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Time: {Math.max(1, Math.round((progress?.time_spent_seconds || 45) / 60))}m</span>
          </span>

          {quizStats.attemptCount > 0 ? (
            <span
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold ${
                quizStats.isWeak
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {quizStats.isWeak && <AlertTriangle className="w-3 h-3" />}
              <span>Quiz: {quizStats.latestScore}% ({quizStats.isWeak ? 'Weak Section <60%' : 'Mastered'})</span>
            </span>
          ) : (
            <span className="text-slate-400 text-[10px]">
              No quiz attempt yet
            </span>
          )}
        </div>
      </div>

      {/* Reader Sub-Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-800/90 rounded-xl border border-slate-700/80">
        {tabButton('pdf', 'Textbook', <BookOpen className="w-3.5 h-3.5" />, 'text-slate-400')}
        {tabButton('slides', 'Slides', <MonitorPlay className="w-3.5 h-3.5" />, 'text-slate-400')}
        {tabButton('summary', 'Key Notes', <Sparkles className="w-3.5 h-3.5" />, 'text-slate-400')}
        {tabButton('notes', `My Notes (${notes.length})`, <StickyNote className="w-3.5 h-3.5" />, 'text-slate-400')}
      </div>

      {/* TAB 1: Textbook — Bundled PDF + extracted text */}
      {activeTab === 'pdf' && (
        <div className="space-y-4">
          {pdfUrl ? (
            <>
              <div className="flex items-center gap-1 p-1 bg-slate-800/90 rounded-xl border border-slate-700/80">
                <button
                  onClick={() => setPdfSubview('pdf')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    pdfSubview === 'pdf' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Raw Textbook PDF</span>
                </button>
                <button
                  onClick={() => setPdfSubview('text')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    pdfSubview === 'text' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileSearch className="w-3.5 h-3.5" />
                  <span>Extracted Text</span>
                </button>
                {section.start_page && (
                  <button
                    onClick={jumpToSectionPage}
                    disabled={pdfSubview !== 'pdf'}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title={`Jump to official textbook page ${section.start_page}`}
                  >
                    Jump to p.{section.start_page}
                  </button>
                )}
              </div>

              {pdfSubview === 'pdf' ? (
                <div className="space-y-3">
                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 text-[11px] text-slate-300 flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      Opening <strong className="text-slate-100">{pdfName}</strong> — the full official textbook
                      {section.start_page && <> scrolled to page {section.start_page}</>}. Works fully offline.
                    </span>
                  </div>
                  <div className="h-[68vh] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                    <PdfViewer
                      ref={pdfRef}
                      fileUrl={pdfUrl}
                      onLoad={handlePdfLoad}
                      onError={(msg) => setPdfError(msg || 'Unknown PDF error')}
                    />
                  </div>
                  {pdfError && (
                    <p className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5">
                      PDF could not be displayed: {pdfError}. Use the "Extracted Text" view instead.
                    </p>
                  )}
                </div>
              ) : (
                <ExtractedTextReader
                  sectionContent={section.section_content}
                  highlights={highlights}
                  highlightColorMap={highlightColorMap}
                  highlightBorderMap={highlightBorderMap}
                  selectedHighlightColor={selectedHighlightColor}
                  isHighlighting={isHighlighting}
                  highlightInput={highlightInput}
                  onSelectColor={setSelectedHighlightColor}
                  onToggleHighlighting={() => setIsHighlighting(!isHighlighting)}
                  onHighlightInputChange={setHighlightInput}
                  onAddHighlight={handleAddHighlight}
                  onDeleteHighlight={handleDeleteHighlight}
                />
              )}
            </>
          ) : (
            <>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-[11px] text-amber-200 flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>No bundled PDF for this textbook on this build — showing the extracted text instead.</span>
              </div>
              <ExtractedTextReader
                sectionContent={section.section_content}
                highlights={highlights}
                highlightColorMap={highlightColorMap}
                highlightBorderMap={highlightBorderMap}
                selectedHighlightColor={selectedHighlightColor}
                isHighlighting={isHighlighting}
                highlightInput={highlightInput}
                onSelectColor={setSelectedHighlightColor}
                onToggleHighlighting={() => setIsHighlighting(!isHighlighting)}
                onHighlightInputChange={setHighlightInput}
                onAddHighlight={handleAddHighlight}
                onDeleteHighlight={handleDeleteHighlight}
              />
            </>
          )}

          <QuizCallout onTakeQuiz={() => onTakeQuiz(stbId, chapterId, sectionId)} />
        </div>
      )}

      {/* TAB 2: Slides presentation */}
      {activeTab === 'slides' && (
        <div className="space-y-4">
          {slides.length > 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="h-[68vh] overflow-hidden">
                <SlidesPlayer title={`${section.section_id}: ${section.section_title}`} slides={slides} />
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/40 p-8 rounded-2xl border border-dashed border-slate-700 text-center text-slate-400 text-xs">
              <MonitorPlay className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="font-medium text-slate-300">No slide deck for this section</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Slide presentations follow the official lesson sequence. Use the Textbook (PDF) or Key Notes tabs.
              </p>
            </div>
          )}

          <QuizCallout onTakeQuiz={() => onTakeQuiz(stbId, chapterId, sectionId)} />
        </div>
      )}

      {/* TAB 3: Key Notes & Solved Examples */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          {basicNotes.length === 0 ? (
            <div className="bg-slate-800/40 p-8 rounded-2xl border border-dashed border-slate-700 text-center text-slate-400 text-xs">
              <Sparkles className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="font-medium text-slate-300">Basic Notes & Solved Examples</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Summary formulas and solved step-by-step examples from the Ethiopian curriculum are linked here.
              </p>
            </div>
          ) : (
            basicNotes.map((note) => (
              <div key={note.record_id} className="space-y-3">
                {note.summary && (
                  <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1.5">
                      Formula & Principle Summary
                    </h4>
                    <div className="text-xs text-slate-200 leading-relaxed">
                      <RichText text={note.summary} />
                    </div>
                  </div>
                )}

                {note.keywords && (
                  <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-2">
                      Key Terminology & Vocabulary
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {note.keywords.split(',').map((kw, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-700">
                          {kw.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {note.solved_examples && (
                  <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                      Worked National Exam Example
                    </h4>
                    <div className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg">
                      <RichText text={note.solved_examples} />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: Personal Study Notes */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <form onSubmit={handleAddStudyNote} className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-2.5">
            <label className="block text-xs font-semibold text-slate-200">
              Write a private study note for this section:
            </label>
            <textarea
              rows={3}
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="e.g. Remember that in adiabatic expansion W is positive and temperature decreases..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium cursor-pointer shadow-md transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Note</span>
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {notes.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-6">
                No personal notes taken yet. Use notes to summarize key points before taking the quiz!
              </p>
            ) : (
              notes.map((note) => (
                <div key={note.note_id} className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs space-y-1">
                  <p className="text-slate-200 whitespace-pre-line">{note.note_text}</p>
                  <p className="text-[10px] text-slate-500">{new Date(note.created_at).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface ExtractedTextReaderProps {
  sectionContent: string;
  highlights: Highlight[];
  highlightColorMap: Record<string, string>;
  highlightBorderMap: Record<string, string>;
  selectedHighlightColor: 'yellow' | 'emerald' | 'sky' | 'rose';
  isHighlighting: boolean;
  highlightInput: string;
  onSelectColor: (color: 'yellow' | 'emerald' | 'sky' | 'rose') => void;
  onToggleHighlighting: () => void;
  onHighlightInputChange: (value: string) => void;
  onAddHighlight: (e: React.FormEvent) => void;
  onDeleteHighlight: (id: string) => void;
}

const ExtractedTextReader: React.FC<ExtractedTextReaderProps> = ({
  sectionContent,
  highlights,
  highlightColorMap,
  highlightBorderMap,
  selectedHighlightColor,
  isHighlighting,
  highlightInput,
  onSelectColor,
  onToggleHighlighting,
  onHighlightInputChange,
  onAddHighlight,
  onDeleteHighlight
}) => {
  const raw = (sectionContent || '').trim();
  const isUsable = raw.length > 0 && raw.toLowerCase() !== 'null';

  if (!isUsable) {
    return (
      <div className="space-y-4">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 text-center text-xs text-slate-400 space-y-3">
          <BookOpen className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="font-medium text-slate-300">No extracted text stored for this section</p>
          <p className="text-[11px] text-slate-500 leading-relaxed max-w-md mx-auto">
            The full chapter text ships in the textbook PDF. Open the Raw Textbook PDF tab for the
            complete section, or use the Slides and Key Notes tabs for lesson summaries.
          </p>
        </div>
      </div>
    );
  }

  return (
  <div className="space-y-4">
    {/* Highlighter Toolbar */}
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Highlighter className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-medium text-slate-300">Highlight Text:</span>
        <div className="flex items-center gap-1.5 ml-1">
          {(['yellow', 'emerald', 'sky', 'rose'] as const).map(color => (
            <button
              key={color}
              onClick={() => onSelectColor(color)}
              className={`w-5 h-5 rounded-full ${highlightColorMap[color]} cursor-pointer transition-transform ${
                selectedHighlightColor === color ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
              }`}
            />
          ))}
        </div>
      </div>

      <button
        onClick={onToggleHighlighting}
        className="px-3 py-1 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1"
      >
        <Plus className="w-3 h-3" />
        <span>{isHighlighting ? 'Cancel' : 'Add Highlight'}</span>
      </button>
    </div>

    {isHighlighting && (
      <form onSubmit={onAddHighlight} className="bg-slate-800 p-3 rounded-xl border border-slate-700 space-y-2">
        <label className="block text-[11px] font-medium text-slate-300">
          Paste or type the text quote to highlight:
        </label>
        <input
          type="text"
          value={highlightInput}
          onChange={(e) => onHighlightInputChange(e.target.value)}
          placeholder="e.g. In an adiabatic process, Q = 0"
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <div className="flex justify-end gap-2">
          <button
            type="submit"
            className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium cursor-pointer"
          >
            Save Highlight
          </button>
        </div>
      </form>
    )}

    {/* Main Formatted Reading View */}
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-inner">
      <div className="text-xs md:text-sm text-slate-200 leading-relaxed">
        <RichText text={sectionContent} />
      </div>
    </div>

    {/* Highlights List if Any */}
    {highlights.length > 0 && (
      <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 space-y-2.5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span>Active Highlights ({highlights.length})</span>
          <span className="text-[10px] text-slate-500">Stored in SQLite</span>
        </div>
        <div className="space-y-2">
          {highlights.map((hl) => (
            <div
              key={hl.highlight_id}
              className={`p-2.5 rounded-r-lg border-l-4 ${highlightBorderMap[hl.highlight_color] || highlightBorderMap.yellow} flex items-start justify-between text-xs`}
            >
              <p className="italic font-medium">&ldquo;{hl.text_content}&rdquo;</p>
              <button
                onClick={() => onDeleteHighlight(hl.highlight_id)}
                className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer shrink-0 ml-2"
                title="Delete highlight"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);
};

const QuizCallout: React.FC<{ onTakeQuiz: () => void }> = ({ onTakeQuiz }) => (
  <div className="p-4 bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3">
    <div>
      <h4 className="text-xs font-bold text-white">Finished reading this section?</h4>
      <p className="text-[11px] text-slate-400 mt-0.5">
        Practice 10 randomized multiple-choice questions with instant explanations.
      </p>
    </div>
    <button
      onClick={onTakeQuiz}
      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
    >
      <BrainCircuit className="w-3.5 h-3.5" />
      <span>Section Quiz</span>
    </button>
  </div>
);