import React from 'react';
import { Lightbulb, ListChecks, Hash, CheckCircle } from 'lucide-react';
import { ChemicalText } from '../lib/chemical';

export interface QuickNotesData {
  notes?: string;
  summary?: string;
  keywords?: string;
  solvedExamples?: string;
}

interface QuickNotesViewProps {
  data: QuickNotesData | null;
  sectionTitle?: string;
}

// One continuous, scrollable study sheet merging Notes + Summary +
// Keywords + Solved Examples. Replaces the tabbed helper drawer.
const QuickNotesView: React.FC<QuickNotesViewProps> = ({ data, sectionTitle }) => {
  const notes = data?.notes?.trim();
  const summary = data?.summary?.trim();
  const keywords = data?.keywords?.trim();
  const examples = data?.solvedExamples?.trim();

  const keywordEntries = keywords
    ? keywords.split(/[•\n;]/).map(k => k.trim()).filter(Boolean)
    : [];
  const exampleBlocks = examples
    ? examples.split('\n\n').map(e => e.trim()).filter(Boolean)
    : [];

  return (
    <div className="h-full overflow-auto bg-slate-100 dark:bg-gray-900 p-4 lg:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {sectionTitle && (
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {sectionTitle}
          </div>
        )}

        {!notes && !summary && !keywords && !examples && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
            <Lightbulb className="h-12 w-12 mb-3 opacity-40" />
            <p className="text-sm">No quick-study content available for this section.</p>
          </div>
        )}

        {summary && (
          <section className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-5">
            <h3 className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm font-semibold mb-3">
              <ListChecks className="h-4 w-4" /> Section Summary
            </h3>
            <p className="text-slate-700 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed"><ChemicalText text={summary} /></p>
          </section>
        )}

        {notes && (
          <section className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-5">
            <h3 className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm font-semibold mb-3">
              <Lightbulb className="h-4 w-4" /> Study Notes
            </h3>
            <p className="text-slate-700 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed"><ChemicalText text={notes} /></p>
          </section>
        )}

        {keywordEntries.length > 0 && (
          <section className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-5">
            <h3 className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm font-semibold mb-3">
              <Hash className="h-4 w-4" /> Key Terms
            </h3>
            <div className="space-y-2">
              {keywordEntries.map((entry, idx) => {
                const colonIdx = entry.indexOf(':');
                const term = colonIdx > 0 ? entry.slice(0, colonIdx).trim() : entry;
                const definition = colonIdx > 0 ? entry.slice(colonIdx + 1).trim() : '';
                return (
                  <div key={idx} className="flex gap-2 text-sm">
                    <span className="text-indigo-500 dark:text-indigo-400 font-semibold">{term}</span>
                    {definition && <span className="text-slate-700 dark:text-gray-300">— {definition}</span>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {exampleBlocks.length > 0 && (
          <section className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-5">
            <h3 className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm font-semibold mb-3">
              <CheckCircle className="h-4 w-4" /> Solved Examples
            </h3>
            <div className="space-y-3">
              {exampleBlocks.map((example, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-gray-900 rounded-xl p-4 border border-slate-200 dark:border-gray-700">
                  <p className="text-slate-700 dark:text-gray-300 text-sm whitespace-pre-wrap"><ChemicalText text={example} /></p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default QuickNotesView;