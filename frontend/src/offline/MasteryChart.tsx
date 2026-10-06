import React from 'react';
import type { SubjectMasteryItem } from './types';

interface Props {
  items: SubjectMasteryItem[];
  passThreshold?: number;
}

export const MasteryChart: React.FC<Props> = ({ items, passThreshold = 50 }) => {
  const visible = items.filter(it => it.assessments_count > 0);
  const hasData = visible.length > 0;
  const ranked = hasData
    ? [...visible].sort((a, b) => b.average_score - a.average_score)
    : items;

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-3 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white tracking-tight">Subject Mastery Breakdown</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="w-0.5 h-3.5 bg-amber-400 rounded-full" />
          <span>{passThreshold}% Pass Threshold</span>
        </div>
      </div>

      {!hasData ? (
        <div className="p-4 bg-slate-900/70 border border-slate-700/80 rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center shrink-0 text-xs font-bold">
            0%
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">No Mastery Data Yet</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Take your first quiz or exam to unlock the per-subject mastery breakdown. Scores will appear here against the {passThreshold}% pass line.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {ranked.map(it => (
            <div key={it.subject_id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-200 line-clamp-1">{it.subject_name}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="font-black text-white">{it.average_score}%</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      it.pass_status === 'PASS'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {it.pass_status === 'PASS' ? 'Pass' : 'Revise'}
                  </span>
                </span>
              </div>

              <div className="relative h-5 bg-slate-900/90 rounded-lg overflow-hidden">
                {/* pass threshold line */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-amber-400/90 z-10"
                  style={{ left: `${passThreshold}%` }}
                />
                <div
                  className="h-full rounded-lg transition-all duration-500 flex items-center"
                  style={{
                    width: `${Math.max(it.average_score, 0)}%`,
                    background: `linear-gradient(90deg, ${it.color}cc, ${it.color})`
                  }}
                >
                  {it.average_score >= 12 && (
                    <span className="relative z-20 pl-1.5 text-[9px] font-bold text-slate-950 uppercase">
                      {it.average_score}%
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>
                  Studies: {Math.round(it.textbook_progress_percent)}% of sections completed
                </span>
                <span>{it.assessments_count} assessment{it.assessments_count === 1 ? '' : 's'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MasteryChart;