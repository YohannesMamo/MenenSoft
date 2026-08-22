import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, Maximize2, Minimize2, MonitorPlay } from 'lucide-react';
import { ChemicalText } from '../lib/chemical';

export interface PresentationSlideData {
  slideId: string;
  slideNumber: number;
  slideTitle: string;
  basicPresentation: string;
  advancedPresentation: string;
  aiPresentation: string;
  notes: string;
  durationSeconds: number;
  hasQuiz: boolean;
}

interface SlidesPlayerProps {
  title: string;
  slides: PresentationSlideData[];
  onFinish?: () => void;
  isCompleted?: boolean;
}

// Full screen slides player that takes the center study column.
// Slides are the primary alternative to reading the textbook PDF.
const SlidesPlayer: React.FC<SlidesPlayerProps> = ({ title, slides, onFinish, isCompleted }) => {
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const total = slides.length;

  useEffect(() => setCurrent(0), [slides]);

  // Optional timed auto-advance when playing.
  useEffect(() => {
    if (!isPlaying || total === 0) return;
    const duration = (slides[current]?.durationSeconds || 10) * 1000;
    const t = setTimeout(() => {
      if (current < total - 1) {
        setCurrent(c => c + 1);
      } else {
        setIsPlaying(false);
        onFinish?.();
      }
    }, duration);
    return () => clearTimeout(t);
  }, [isPlaying, current, slides, total, onFinish]);

  // Keyboard navigation while slides mode is active.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setCurrent(c => Math.max(0, c - 1));
      else if (e.key === 'ArrowRight') setCurrent(c => Math.min(total - 1, c + 1));
      else if (e.key === ' ') { e.preventDefault(); gotoNext(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, current]);

  const gotoNext = () => {
    if (current >= total - 1) {
      setIsPlaying(false);
      onFinish?.();
    } else {
      setCurrent(c => c + 1);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
        <MonitorPlay className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-sm">No slides available for this section.</p>
      </div>
    );
  }

  const slide = slides[current];
  const content = slide?.basicPresentation || slide?.advancedPresentation || slide?.aiPresentation || '';

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-slate-100 dark:bg-gray-900">
      {/* Slides top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
        <div className="flex items-center gap-2 min-w-0">
          <MonitorPlay className="h-4 w-4 shrink-0" />
          <span className="font-medium text-sm truncate">{title}</span>
          <span className="text-xs bg-white/20 rounded-full px-2 py-0.5 shrink-0">
            Slide {current + 1} / {total}
          </span>
          {isCompleted && <span className="text-xs bg-emerald-400/20 text-emerald-100 rounded-full px-2 py-0.5 shrink-0">{'\u2713'} Studied</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsPlaying(p => !p)} className="p-1.5 hover:bg-white/20 rounded transition-colors" title={isPlaying ? 'Pause auto-advance' : 'Auto-advance'}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button onClick={toggleFullscreen} className="p-1.5 hover:bg-white/20 rounded transition-colors" title="Fullscreen">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Slide body */}
      <div className="flex-1 overflow-auto p-6 lg:p-10">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-slate-200 dark:border-gray-700 p-6 lg:p-10 min-h-[300px]">
          {slide?.slideTitle && (
            <h3 className="text-lg lg:text-xl font-bold text-indigo-700 dark:text-indigo-300 mb-4">{slide.slideTitle}</h3>
          )}
          <p className="text-slate-700 dark:text-gray-300 text-sm lg:text-base whitespace-pre-wrap leading-relaxed">
            <ChemicalText text={content || 'No slide content available.'} />
          </p>
          {slide?.notes && (
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Speaker Notes</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm whitespace-pre-wrap"><ChemicalText text={slide.notes} /></p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-t border-slate-200 dark:border-gray-700">
        <button
          onClick={() => setCurrent(c => Math.max(0, c - 1))}
          disabled={current === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-gray-600 text-sm font-medium disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>
        <div className="flex items-center gap-1 overflow-hidden">
          {slides.map((s, i) => (
            <button
              key={s.slideId || i}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all ${i === current ? 'w-6 bg-indigo-600' : 'w-2 bg-slate-300 dark:bg-gray-600 hover:bg-slate-400'}`}
              title={`Slide ${i + 1}`}
            />
          ))}
        </div>
        <button
          onClick={gotoNext}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          {current >= total - 1 ? (isCompleted ? 'Done' : 'Finish') : <>Next <ChevronRight className="h-4 w-4" /></>}
        </button>
      </div>
    </div>
  );
};

export default SlidesPlayer;