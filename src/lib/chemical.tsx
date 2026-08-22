import React from 'react';

const CHEM_REGEX = /([A-Z][a-z]?|\))(\d+)/g;

export function ChemicalText({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  CHEM_REGEX.lastIndex = 0;
  while ((match = CHEM_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index}>
        {match[1]}
        <sub>{match[2]}</sub>
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <span className={className}>{parts}</span>;
}
