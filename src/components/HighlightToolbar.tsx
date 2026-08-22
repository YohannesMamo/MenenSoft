import React, { useState, useEffect } from 'react';

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

interface HighlightToolbarProps {
  selectedText?: string;
  position?: { x: number; y: number } | null;
  onHighlight: (color: string, note?: string) => void;
  onClose: () => void;
  onCopy?: () => void;
  existingHighlight?: Highlight | null;
  onUpdateHighlight?: (highlightId: string, color: string, note: string) => void;
  onDeleteHighlight?: (highlightId: string) => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'yellow', color: '#FEF08A', label: 'Yellow' },
  { name: 'blue', color: '#93C5FD', label: 'Blue' },
  { name: 'green', color: '#86EFAC', label: 'Green' },
  { name: 'red', color: '#FCA5A5', label: 'Red' },
  { name: 'purple', color: '#C4B5FD', label: 'Purple' },
];

const HighlightToolbar: React.FC<HighlightToolbarProps> = ({
  position,
  onHighlight,
  onClose,
  onCopy,
  existingHighlight,
  onUpdateHighlight,
  onDeleteHighlight,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [highlightNote, setHighlightNote] = useState('');
  const [selectedColor, setSelectedColor] = useState(existingHighlight?.highlightColor || '#FEF08A');

  useEffect(() => {
    if (existingHighlight) {
      setHighlightNote(existingHighlight.note || '');
      setSelectedColor(existingHighlight.highlightColor);
    }
  }, [existingHighlight]);

  const handleQuickHighlight = (color: string) => {
    console.log('[HighlightToolbar] Quick highlight with color:', color);
    onHighlight(color);
    onClose();
  };

  const handleAddNote = () => {
    setShowNoteInput(true);
    setShowColorPicker(false);
  };

  const handleSaveWithNote = () => {
    if (existingHighlight && onUpdateHighlight) {
      onUpdateHighlight(existingHighlight.highlightId, selectedColor, highlightNote);
    } else {
      onHighlight(selectedColor, highlightNote);
    }
    onClose();
  };

  if (!position && !existingHighlight) {
    return null;
  }

  const toolbarContent = (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-slate-200 dark:border-gray-700 overflow-hidden">
      {!showNoteInput && !showColorPicker && (
        <div className="p-2">
          {!existingHighlight ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleQuickHighlight('#FEF08A')}
                className="px-3 py-1.5 text-xs bg-yellow-100 dark:bg-yellow-900/40 hover:bg-yellow-200 dark:hover:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded transition-colors font-medium"
                title="Highlight Yellow"
              >
                🖍️ Highlight
              </button>
              {onCopy && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy();
                  }}
                  className="px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors flex items-center gap-1"
                >
                  📋 Copy
                </button>
              )}
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 rounded transition-colors"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddNote}
                className="px-3 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors flex items-center gap-1"
              >
                📝 Add Note
              </button>
              {onCopy && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy();
                  }}
                  className="px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors flex items-center gap-1"
                >
                  📋 Copy
                </button>
              )}
              {onDeleteHighlight && (
                <button
                  onClick={() => {
                    onDeleteHighlight(existingHighlight.highlightId);
                    onClose();
                  }}
                  className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                >
                  🗑️ Delete
                </button>
              )}
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 rounded transition-colors"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {showColorPicker && !showNoteInput && !existingHighlight && (
        <div className="p-2">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 px-1">Choose color:</div>
          <div className="flex gap-2 px-1">
            {HIGHLIGHT_COLORS.map((colorOption) => (
              <button
                key={colorOption.name}
                onClick={() => handleQuickHighlight(colorOption.color)}
                className="w-7 h-7 rounded-full border-2 border-transparent hover:border-slate-400 transition-all"
                style={{ backgroundColor: colorOption.color }}
                title={colorOption.label}
              />
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-gray-700">
            <button
              onClick={() => setShowColorPicker(false)}
              className="w-full px-3 py-1.5 text-xs text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showNoteInput && (
        <div className="p-3" onClick={(e) => e.stopPropagation()}>
          <div className="text-xs text-slate-600 dark:text-gray-300 mb-2 font-medium">
            {existingHighlight ? 'Update note:' : 'Add note (optional):'}
          </div>
          <textarea
            value={highlightNote}
            onChange={(e) => setHighlightNote(e.target.value)}
            placeholder="Why is this important?"
            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            rows={2}
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                setShowNoteInput(false);
                setShowColorPicker(false);
              }}
              className="flex-1 px-3 py-1.5 text-xs text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveWithNote}
              className="flex-1 px-3 py-1.5 text-xs bg-indigo-600 text-white hover:bg-indigo-700 rounded transition-colors font-medium"
            >
              {existingHighlight ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (!position) {
    return toolbarContent;
  }

  return (
    <div
      className="fixed z-50"
      style={{
        left: Math.min(position.x, window.innerWidth - 250),
        top: Math.min(position.y - 10, window.innerHeight - 150),
      }}
    >
      {toolbarContent}
    </div>
  );
};

export default HighlightToolbar;