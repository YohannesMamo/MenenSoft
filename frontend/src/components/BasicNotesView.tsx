/**
 * BasicNotesView
 * Wrapper around QuickNotesData for the offline study page.
 */
import QuickNotesView, { type QuickNotesData } from './QuickNotesView';

interface BasicNotesViewProps {
  notes: {
    notes?: string;
    summary?: string;
    keywords?: string;
    solved_examples?: string;
  } | null;
}

export default function BasicNotesView({ notes }: BasicNotesViewProps) {
  if (!notes) {
    return (
      <div className="text-center py-8 text-gray-500 italic">
        No quick-study content available for this section.
      </div>
    );
  }

  const data: QuickNotesData = {
    notes: notes.notes || undefined,
    summary: notes.summary || undefined,
    keywords: notes.keywords || undefined,
    solvedExamples: notes.solved_examples || undefined,
  };

  return <QuickNotesView data={data} />;
}
