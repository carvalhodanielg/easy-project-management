import { useRef, useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSpaceMembers } from '../../api/spaces.api';
import type { User } from '../../types/user.types';

interface Member {
  _id: string;
  displayName: string;
  avatarUrl: string | null;
}

interface Props {
  spaceId: string;
  value: string;
  onChange: (value: string) => void;
  onMentionIdsChange: (ids: string[]) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  autoFocus?: boolean;
}

function getMentionQuery(text: string, cursor: number): string | null {
  const before = text.slice(0, cursor);
  const match = before.match(/@(\w*)$/);
  return match ? match[1] : null;
}

export function MentionTextarea({
  spaceId,
  value,
  onChange,
  onMentionIdsChange,
  placeholder,
  rows = 3,
  className,
  onKeyDown,
  onPaste,
  autoFocus,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionedIds, setMentionedIds] = useState<Set<string>>(new Set());
  const [highlightedIdx, setHighlightedIdx] = useState(0);

  const { data: membersRaw = [] } = useQuery({
    queryKey: ['space-members', spaceId],
    queryFn: () => getSpaceMembers(spaceId),
    staleTime: 60_000,
  });

  const members: Member[] = membersRaw.map((m) => ({
    _id: typeof m.userId === 'string' ? m.userId : (m.userId as User)._id,
    displayName: typeof m.userId === 'string' ? m.userId : (m.userId as User).displayName,
    avatarUrl: typeof m.userId === 'string' ? null : (m.userId as User).avatarUrl,
  }));

  const filtered = mentionQuery !== null
    ? members.filter((m) =>
        m.displayName.toLowerCase().includes(mentionQuery.toLowerCase()),
      )
    : [];

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursor = e.target.selectionStart ?? text.length;
    onChange(text);
    const query = getMentionQuery(text, cursor);
    setMentionQuery(query);
    setHighlightedIdx(0);
  };

  const insertMention = useCallback(
    (member: Member) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const cursor = textarea.selectionStart ?? value.length;
      const before = value.slice(0, cursor).replace(/@\w*$/, `@${member.displayName} `);
      const after = value.slice(cursor);
      const newText = before + after;
      onChange(newText);
      setMentionQuery(null);

      const newIds = new Set(mentionedIds);
      newIds.add(member._id);
      setMentionedIds(newIds);
      onMentionIdsChange(Array.from(newIds));

      // restore cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(before.length, before.length);
      }, 0);
    },
    [value, mentionedIds, onChange, onMentionIdsChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filtered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIdx((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIdx((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filtered[highlightedIdx]);
        return;
      }
      if (e.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }
    onKeyDown?.(e);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const close = () => setMentionQuery(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // Reset mentioned IDs when value is cleared
  useEffect(() => {
    if (!value.trim()) {
      setMentionedIds(new Set());
      onMentionIdsChange([]);
    }
  }, [value, onMentionIdsChange]);

  return (
    <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={onPaste}
        placeholder={placeholder}
        rows={rows}
        className={className}
        autoFocus={autoFocus}
      />

      {mentionQuery !== null && filtered.length > 0 && (
        <ul className="absolute z-50 bottom-full mb-1 left-0 w-56 bg-surface border border-line rounded-xl shadow-lg overflow-hidden">
          {filtered.map((member, idx) => (
            <li
              key={member._id}
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(member);
              }}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-sm transition-colors ${
                idx === highlightedIdx
                  ? 'bg-brand/10 text-ink'
                  : 'text-ink hover:bg-lift'
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-brand/20 text-brand text-[10px] font-bold flex items-center justify-center shrink-0">
                {member.displayName.charAt(0).toUpperCase()}
              </span>
              <span className="truncate">{member.displayName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
