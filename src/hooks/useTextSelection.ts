import { useState, useEffect, useCallback } from 'react';

export interface SelectionData {
  text: string;
  position: { x: number; y: number };
}

export const useTextSelection = () => {
  const [selection, setSelection] = useState<SelectionData | null>(null);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setSelection(null);
      return;
    }

    const text = sel.toString().trim();
    if (!text) {
      setSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    setSelection({
      text,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.bottom + window.scrollY + 10,
      },
    });
  }, []);

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseUp]);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  }, []);

  return { selection, clearSelection };
};

export default useTextSelection;