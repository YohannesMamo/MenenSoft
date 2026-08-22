import React, { useState, useEffect } from 'react';
import { Loader2, Trash2, Edit3, MessageSquare, ExternalLink, Filter } from 'lucide-react';
const API_BASE = import.meta.env.VITE_API_URL || '/api';
interface Highlight {
  highlightId: string;
  studentId: string;
  stbId: string;
  chapterId: number;
  sectionId: string;
  pageNumber: number;
  textContent: string;
  highlightColor: string;
  note: string | null;
  createdAt: string;
}

interface HighlightsPanelProps {
  studentId: string;
  stbId: string;
  activeSection: { chapterId: number; sectionId: string } | null;
  onNavigateToHighlight: (chapterId: number, sectionId: string, pageNumber: number) => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'yellow', color: '#FEF08A', label: 'Key Concept' },
  { name: 'blue', color: '#93C5FD', label: 'Definition' },
  { name: 'green', color: '#86EFAC', label: 'Example' },
  { name: 'red', color: '#FCA5A5', label: 'Review' },
  { name: 'purple', color: '#C4B5FD', label: 'Reflection' },
];

const HighlightsPanel: React.FC<HighlightsPanelProps> = ({
  studentId,
  stbId,
  activeSection,
  onNavigateToHighlight,
}) => {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterColor, setFilterColor] = useState<string | null>(null);
  const [filterSection, setFilterSection] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');

  const loadHighlights = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = activeSection
        ? `/api/highlights/${studentId}/section/${activeSection.sectionId}`
        : `/api/highlights/${studentId}?stbId=${stbId}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setHighlights(data.highlights || []);
      }
    } catch (error) {
      console.error('Failed to load highlights:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHighlights();
  }, [studentId, stbId, activeSection]);

  const updateHighlight = async (highlightId: string, color: string, note: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/highlights/${highlightId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ highlightColor: color, note })
      });
      
      if (response.ok) {
        setHighlights(prev =>
          prev.map(h =>
            h.highlightId === highlightId
              ? { ...h, highlightColor: color, note }
              : h
          )
        );
        setEditingHighlight(null);
      }
    } catch (error) {
      console.error('Failed to update highlight:', error);
    }
  };

  const deleteHighlight = async (highlightId: string) => {
    if (!confirm('Delete this highlight?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/highlights/${highlightId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        setHighlights(prev => prev.filter(h => h.highlightId !== highlightId));
      }
    } catch (error) {
      console.error('Failed to delete highlight:', error);
    }
  };

  const filteredHighlights = highlights.filter(h => {
    if (filterColor && h.highlightColor !== filterColor) return false;
    if (filterSection && h.sectionId !== filterSection) return false;
    return true;
  });

  const getColorStyle = (colorName: string) => {
    const colorMap: Record<string, string> = {
      yellow: '#FEF08A',
      blue: '#93C5FD',
      green: '#86EFAC',
      red: '#FCA5A5',
      purple: '#C4B5FD',
    };
    return colorMap[colorName] || '#FEF08A';
  };

  const getColorLabel = (colorName: string) => {
    const color = HIGHLIGHT_COLORS.find(c => c.name === colorName);
    return color?.label || 'Highlight';
  };

  const uniqueSections = Array.from(new Set(highlights.map(h => h.sectionId)));

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <div className="p-3 border-b border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-700 dark:text-gray-200 flex items-center gap-2">
            <span className="text-xl">📝</span> My Highlights
          </h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded transition-colors ${
              showFilters ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-500 dark:text-gray-400'
            }`}
          >
            <Filter size={14} />
          </button>
        </div>
        
        {showFilters && (
          <div className="flex gap-2 mt-2">
            <select
              value={filterColor || ''}
              onChange={(e) => setFilterColor(e.target.value || null)}
              className="flex-1 px-2 py-1.5 text-xs bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Colors</option>
              {HIGHLIGHT_COLORS.map(c => (
                <option key={c.name} value={c.name}>{c.label}</option>
              ))}
            </select>
            {uniqueSections.length > 1 && (
              <select
                value={filterSection || ''}
                onChange={(e) => setFilterSection(e.target.value || null)}
                className="flex-1 px-2 py-1.5 text-xs bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All Sections</option>
                {uniqueSections.map(s => (
                  <option key={s} value={s}>Section {s}</option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="flex gap-1 mt-2">
          {HIGHLIGHT_COLORS.map(color => {
            const count = highlights.filter(h => h.highlightColor === color.name).length;
            return (
              <button
                key={color.name}
                onClick={() => setFilterColor(filterColor === color.name ? null : color.name)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
                  filterColor === color.name
                    ? 'ring-2 ring-indigo-500 bg-opacity-80'
                    : 'hover:bg-opacity-80'
                }`}
                style={{ backgroundColor: color.color }}
              >
                <span>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
        ) : filteredHighlights.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">✨</div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {highlights.length === 0
                ? 'No highlights yet. Select text in the PDF to create one!'
                : 'No highlights match the current filter.'}
            </p>
          </div>
        ) : (
          filteredHighlights.map(highlight => (
            <div
              key={highlight.highlightId}
              className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className="h-2"
                style={{ backgroundColor: getColorStyle(highlight.highlightColor) }}
              />
              <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: getColorStyle(highlight.highlightColor),
                      color: '#374151'
                    }}
                  >
                    {getColorLabel(highlight.highlightColor)}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onNavigateToHighlight(highlight.chapterId, highlight.sectionId, highlight.pageNumber)}
                      className="p-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded text-indigo-600 dark:text-indigo-400 transition-colors"
                      title="Go to this highlight"
                    >
                      <ExternalLink size={12} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingHighlight(highlight.highlightId);
                        setEditNote(highlight.note || '');
                      }}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-gray-700 rounded text-slate-500 dark:text-slate-400 transition-colors"
                      title="Edit"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => deleteHighlight(highlight.highlightId)}
                      className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-slate-700 dark:text-gray-300 line-clamp-3 mb-2 italic">
                  "{highlight.textContent}"
                </p>

                {highlight.note && (
                  <div className="flex items-start gap-2 bg-slate-50 dark:bg-gray-900 p-2 rounded text-xs">
                    <MessageSquare size={12} className="text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" />
                    <p className="text-slate-600 dark:text-gray-400">{highlight.note}</p>
                  </div>
                )}

                {editingHighlight === highlight.highlightId && (
                  <div className="mt-2 p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded">
                    <textarea
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="Add a note..."
                      className="w-full px-2 py-1.5 text-xs bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-800 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setEditingHighlight(null)}
                        className="flex-1 px-2 py-1 text-xs text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => updateHighlight(highlight.highlightId, highlight.highlightColor, editNote)}
                        className="flex-1 px-2 py-1 text-xs bg-indigo-600 text-white hover:bg-indigo-700 rounded"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                  <span>Page {highlight.pageNumber}</span>
                  <span>{new Date(highlight.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HighlightsPanel;
