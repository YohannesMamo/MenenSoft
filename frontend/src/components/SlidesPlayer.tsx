import React, { useEffect, useMemo, useRef, useState } from 'react';
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

// Content is one point per line — render as a bullet list.
function parseContent(text: string): string[] {
  if (!text) return [];
  return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
}

// Delay (ms) between each successive fade-in within a slide.
const REVEAL_OFFSET = 350;

const FullScreenSlidesPlayer: React.FC<SlidesPlayerProps> = ({ title, slides, onFinish, isCompleted }) => {
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [isDone, setIsDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const total = slides.length;

  const slide = slides[current];
  const content = slide?.basicPresentation || slide?.advancedPresentation || slide?.aiPresentation || '';
  const hasNotes = !!slide?.notes;

  // Steps that will reveal in order on this slide.
  const steps = useMemo(() => {
    if (!slide) return [];
    return hasNotes ? ['title', 'content', 'notes'] : ['title', 'content'];
  }, [slide, hasNotes]);

  useEffect(() => { setCurrent(0); setIsDone(false); }, [slides]);

  // Reset on slide change.
  useEffect(() => {
    setRevealed([]);
    setIsDone(false);
    setIsPlaying(prev => prev && true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, slide?.slideId]);

  // Sequential fade-in: title, then content, then notes appear one at a time.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (steps.length > 0) {
      steps.forEach((s, i) => {
        timers.push(setTimeout(() => {
          setRevealed(prev => prev.includes(s) ? prev : [...prev, s]);
        }, i * REVEAL_OFFSET));
      });
    }
    return () => timers.forEach(clearTimeout);
  }, [current, steps]);

  // Auto-advance timer (starts after the reveal sequence so each build is seen).
  useEffect(() => {
    if (!isPlaying || steps.length === 0) return;
    const t = setTimeout(() => {
      if (current < total - 1) setCurrent(c => c + 1);
      else { setIsPlaying(false); setIsDone(true); onFinish?.(); }
    }, (slide?.durationSeconds || 10) * 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, current, steps.length]);

  // Keyboard navigation.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') gotoNext();
      else if (e.key === ' ') { e.preventDefault(); gotoNext(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, steps.length]);

  const gotoNext = () => {
    if (current >= total - 1) {
      setIsPlaying(false);
      setIsDone(true);
      onFinish?.();
    } else {
      setCurrent(c => c + 1);
    }
  };

  const goPrev = () => setCurrent(c => Math.max(0, c - 1));

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const fade = (active: boolean) => {
    return active
      ? 'opacity-100 translate-y-0'
      : 'opacity-0 translate-y-2';
  };

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
        <MonitorPlay className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-sm">No slides available for this section.</p>
      </div>
    );
  }

  const bodyPad = isFullscreen ? 'p-8 lg:p-16' : 'p-6 lg:p-10';
  const cardMax = isFullscreen ? '' : 'max-w-4xl';
  const titleSize = isFullscreen ? 'text-3xl lg:text-5xl' : 'text-lg lg:text-2xl';
  const contentSize = isFullscreen ? 'text-xl lg:text-3xl' : 'text-base';
  const notesSize = isFullscreen ? 'text-base lg:text-xl' : 'text-sm';

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-slate-100 dark:bg-gray-900">
      {/* Slides top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
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

      {/* Slide body — blank until Title/Content/Notes fade in sequentially */}
      <div className={`flex-1 overflow-auto ${bodyPad}`}>
        <div className={`mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-slate-200 dark:border-gray-700 ${bodyPad} min-h-[320px] ${cardMax}`}>
          {/* Title: white text on blue */}
          <div className={`transition-opacity duration-500 ease-out ${fade(revealed.includes('title'))}`}>
            <div className={`rounded-xl bg-blue-600 text-white px-6 py-5 mb-5 ${titleSize}`}>
              <h3 className="font-bold leading-snug">
                <ChemicalText text={slide?.slideTitle || 'Untitled Slide'} />
              </h3>
            </div>
          </div>

          {/* Content: black text on white */}
          <div className={`transition-opacity duration-500 ease-out ${fade(revealed.includes('content'))}`}>
            <div className="rounded-xl bg-white text-gray-900 px-2">
              {content ? (
                <ul className="space-y-2.5 list-disc pl-5">
                  {parseContent(content).map((line, i) => (
                    <li key={i} className={`leading-relaxed ${contentSize}`}>
                      <ChemicalText text={line} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 text-base">No slide content available.</p>
              )}
            </div>
          </div>

          {/* Notes: white text on emerald */}
          {hasNotes && (
            <div className={`mt-5 transition-opacity duration-500 ease-out ${fade(revealed.includes('notes'))}`}>
              <div className="rounded-xl bg-emerald-600 text-white px-5 py-4">
                <p className={`font-semibold mb-1 ${notesSize}`}>Notes</p>
                <p className={`leading-relaxed ${notesSize}`}>
                  <ChemicalText text={slide?.notes || ''} />
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-t border-slate-200 dark:border-gray-700">
        <button
          onClick={goPrev}
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
              className={`h-2 rounded-full transition-all ${i === current ? 'w-6 bg-blue-600' : 'w-2 bg-slate-300 dark:bg-gray-600 hover:bg-slate-400'}`}
              title={`Slide ${i + 1}`}
            />
          ))}
        </div>
        <button
          onClick={gotoNext}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          {current >= total - 1 ? (isCompleted || isDone ? 'Done' : 'Finish') : <>Next <ChevronRight className="h-4 w-4" /></>}
        </button>
      </div>
    </div>
  );
};

export default FullScreenSlidesPlayer;
