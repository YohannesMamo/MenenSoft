import React, { useState } from 'react';
import { sqliteDb } from './db';
import {
  BookOpen,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Bookmark,
  Search,
  BookMarked
} from 'lucide-react';

interface Props {
  selectedBookId: string | null;
  onSelectSection: (stbId: string, chapterId: number, sectionId: string) => void;
}

export const StudyScreen: React.FC<Props> = ({ selectedBookId, onSelectSection }) => {
  const metadata = sqliteDb.getAppMetadata();
  const textbooks = sqliteDb.getTextbooks();
  const [activeBookId, setActiveBookId] = useState<string>(selectedBookId || textbooks[0]?.stb_id || '');
  const [expandedChapterId, setExpandedChapterId] = useState<number | null>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'textbooks' | 'bookmarks'>('textbooks');

  const bookmarks = sqliteDb.getBookmarks();
  const activeBook = textbooks.find(b => b.stb_id === activeBookId) || textbooks[0];
  const chapters = activeBook ? sqliteDb.getChapters(activeBook.stb_id) : [];

  const filteredBooks = textbooks.filter(b =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.subject_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-8">
      {/* Top Header & Search */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {metadata.grade_label} Study Modules
            </h2>
            <p className="text-xs text-slate-400">
              Offline Ethiopian textbooks & interactive section reader
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveTab('textbooks')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                activeTab === 'textbooks' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Textbooks
            </button>
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === 'bookmarks' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bookmark className="w-3 h-3" />
              <span>Bookmarks ({bookmarks.length})</span>
            </button>
          </div>
        </div>

        {activeTab === 'textbooks' && (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${metadata.grade_label} subjects...`}
              className="w-full pl-9 pr-4 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        )}
      </div>

      {activeTab === 'bookmarks' ? (
        <div className="space-y-3">
          {bookmarks.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-800/40 rounded-xl border border-dashed border-slate-700">
              <BookMarked className="w-10 h-10 text-slate-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300">No bookmarks saved yet</p>
              <p className="text-xs text-slate-500 mt-1">
                While reading any section, tap the bookmark icon to save it here for quick revision.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {bookmarks.map((bm) => {
                const book = sqliteDb.getTextbook(bm.stb_id);
                const section = sqliteDb.getSection(bm.stb_id, bm.chapter_id, bm.section_id);
                return (
                  <div
                    key={bm.bookmark_id}
                    onClick={() => onSelectSection(bm.stb_id, bm.chapter_id, bm.section_id)}
                    className="p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-emerald-500/40 rounded-xl flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                        <Bookmark className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-white">
                          {section?.section_title || bm.section_id}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {book?.title} • Chapter {bm.chapter_id}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Horizontal Textbook Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {filteredBooks.map((book) => {
              const isSelected = book.stb_id === activeBookId;
              return (
                <button
                  key={book.stb_id}
                  onClick={() => {
                    setActiveBookId(book.stb_id);
                    setExpandedChapterId(1);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700/80'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{book.title.replace('Grade 12 ', '').replace(' Student Textbook', '')}</span>
                </button>
              );
            })}
          </div>

          {/* Active Book Detail Card */}
          {activeBook && (
            <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
                <div>
                  <h3 className="text-sm font-bold text-white">{activeBook.title}</h3>
                  <p className="text-[11px] text-slate-400">
                    Published {activeBook.published_year || 2023} • Ministry of Education Ethiopia
                  </p>
                </div>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-300">
                  {chapters.length} Units
                </span>
              </div>

              {/* Chapters & Sections Accordion */}
              <div className="space-y-2.5">
                {chapters.map((chapter) => {
                  const isExpanded = expandedChapterId === chapter.chapter_id;
                  const sections = sqliteDb.getSections(activeBook.stb_id, chapter.chapter_id);

                  return (
                    <div
                      key={chapter.record_id}
                      className="border border-slate-700/60 rounded-xl overflow-hidden bg-slate-900/60 transition-colors"
                    >
                      {/* Chapter Row Header */}
                      <button
                        onClick={() => setExpandedChapterId(isExpanded ? null : chapter.chapter_id)}
                        className="w-full p-3 flex items-center justify-between hover:bg-slate-800/60 transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                            {chapter.chapter_id}
                          </span>
                          <div>
                            <h4 className="text-xs font-semibold text-white">
                              {chapter.chapter_title}
                            </h4>
                            <p className="text-[10px] text-slate-400">
                              Pages {chapter.start_page}–{chapter.end_page} · {sections.length} Sections
                            </p>
                          </div>
                        </div>

                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                      </button>

                      {/* Sections List */}
                      {isExpanded && (
                        <div className="border-t border-slate-800 p-2 space-y-1 bg-slate-950/40">
                          {sections.map((section) => {
                            const progress = sqliteDb.getSectionProgress(
                              activeBook.stb_id,
                              chapter.chapter_id,
                              section.section_id
                            );
                            const isCompleted = progress?.is_completed === 1;

                            return (
                              <div
                                key={section.record_id}
                                onClick={() =>
                                  onSelectSection(
                                    activeBook.stb_id,
                                    chapter.chapter_id,
                                    section.section_id
                                  )
                                }
                                className="p-2.5 rounded-lg hover:bg-slate-800/80 flex items-center justify-between cursor-pointer transition-colors group"
                              >
                                <div className="flex items-center gap-2.5">
                                  {isCompleted ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border border-slate-600 group-hover:border-emerald-500 shrink-0" />
                                  )}
                                  <div>
                                    <span className="text-xs font-medium text-slate-200 group-hover:text-emerald-300">
                                      {section.section_id}: {section.section_title}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 text-slate-500 group-hover:text-slate-300">
                                  <span className="text-[10px] uppercase font-semibold">Read</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
