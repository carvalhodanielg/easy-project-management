import type { ReactNode } from 'react';

/**
 * Splits text by @mention tokens and wraps them in a highlighted span.
 * Matches @Word or @Word Word (up to two words after @).
 */
export function renderMentions(text: string): ReactNode[] {
  const parts = text.split(/(@\w[\w\s]*?\b)(?=\s|$|[^a-zA-Z\s])/g);
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="text-brand font-medium">
        {part}
      </span>
    ) : (
      part
    ),
  );
}
