import { useRef, useState, useCallback, useLayoutEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Code, Eye, Paperclip, Loader2 } from 'lucide-react';
import { splitLines, joinLines } from './markdownLineUtils';
import { buildMarkdownEmbed, ACCEPT_ATTACHMENTS } from '../../api/attachments.api';
import { useAttachmentUpload, filesFromPaste, filesFromDrop } from '../../hooks/useAttachmentUpload';

export type EditorMode = 'raw' | 'live';

export interface MarkdownLiveEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  onBlur?: () => void;
}

export function MarkdownLiveEditor({
  value,
  onChange,
  placeholder,
  minHeight = 120,
  onBlur,
}: MarkdownLiveEditorProps) {
  const [mode, setMode] = useState<EditorMode>('live');
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const activeTextareaRef = useRef<HTMLTextAreaElement>(null);
  const rawTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Cursor column to apply after the next render
  const pendingCursorRef = useRef<{ line: number; col: number } | null>(null);

  const { uploading, error: uploadError, uploadFiles } = useAttachmentUpload();

  const lines = splitLines(value);

  // After every render: apply pending cursor position and auto-resize active textarea
  useLayoutEffect(() => {
    const ta = activeTextareaRef.current;
    if (!ta) return;

    // Auto-resize height
    ta.style.height = '0';
    ta.style.height = ta.scrollHeight + 'px';

    // Apply pending cursor
    const pending = pendingCursorRef.current;
    if (pending !== null && activeLine === pending.line) {
      const col = Math.min(pending.col, lines[activeLine]?.length ?? 0);
      ta.setSelectionRange(col, col);
      pendingCursorRef.current = null;
    }
  });

  const moveTo = useCallback((lineIndex: number, col: number) => {
    pendingCursorRef.current = { line: lineIndex, col };
    setActiveLine(lineIndex);
  }, []);

  const updateLine = useCallback(
    (lineIndex: number, newContent: string) => {
      const newLines = [...lines];
      newLines[lineIndex] = newContent;
      onChange(joinLines(newLines));
    },
    [lines, onChange],
  );

  const handleLineKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>, lineIndex: number) => {
      const ta = e.currentTarget;
      const col = ta.selectionStart;
      const lineLen = lines[lineIndex].length;

      switch (e.key) {
        case 'Enter': {
          if (e.shiftKey) break; // allow shift+enter for line break within cell
          e.preventDefault();
          const before = lines[lineIndex].slice(0, col);
          const after = lines[lineIndex].slice(col);
          const newLines = [...lines];
          newLines.splice(lineIndex, 1, before, after);
          onChange(joinLines(newLines));
          pendingCursorRef.current = { line: lineIndex + 1, col: 0 };
          setActiveLine(lineIndex + 1);
          break;
        }
        case 'Backspace': {
          if (col === 0 && lineIndex > 0) {
            e.preventDefault();
            const prevLen = lines[lineIndex - 1].length;
            const merged = lines[lineIndex - 1] + lines[lineIndex];
            const newLines = [...lines];
            newLines.splice(lineIndex - 1, 2, merged);
            onChange(joinLines(newLines));
            pendingCursorRef.current = { line: lineIndex - 1, col: prevLen };
            setActiveLine(lineIndex - 1);
          }
          break;
        }
        case 'Delete': {
          if (col === lineLen && lineIndex < lines.length - 1) {
            e.preventDefault();
            const merged = lines[lineIndex] + lines[lineIndex + 1];
            const newLines = [...lines];
            newLines.splice(lineIndex, 2, merged);
            onChange(joinLines(newLines));
            pendingCursorRef.current = { line: lineIndex, col };
          }
          break;
        }
        case 'ArrowDown': {
          if (lineIndex < lines.length - 1) {
            e.preventDefault();
            pendingCursorRef.current = { line: lineIndex + 1, col };
            setActiveLine(lineIndex + 1);
          }
          break;
        }
        case 'ArrowUp': {
          if (lineIndex > 0) {
            e.preventDefault();
            pendingCursorRef.current = { line: lineIndex - 1, col };
            setActiveLine(lineIndex - 1);
          }
          break;
        }
        case 'ArrowRight': {
          if (col === lineLen && lineIndex < lines.length - 1) {
            e.preventDefault();
            pendingCursorRef.current = { line: lineIndex + 1, col: 0 };
            setActiveLine(lineIndex + 1);
          }
          break;
        }
        case 'ArrowLeft': {
          if (col === 0 && lineIndex > 0) {
            e.preventDefault();
            pendingCursorRef.current = { line: lineIndex - 1, col: lines[lineIndex - 1].length };
            setActiveLine(lineIndex - 1);
          }
          break;
        }
        case 'Tab': {
          e.preventDefault();
          const before = lines[lineIndex].slice(0, col);
          const after = lines[lineIndex].slice(col);
          updateLine(lineIndex, before + '  ' + after);
          pendingCursorRef.current = { line: lineIndex, col: col + 2 };
          break;
        }
        case 'Escape': {
          setActiveLine(null);
          onBlur?.();
          break;
        }
      }
    },
    [lines, onChange, updateLine, onBlur],
  );

  const handleLineBlur = useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      // Only blur if focus isn't moving to another line in this editor
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      if (!relatedTarget?.closest('.markdown-live-editor')) {
        setActiveLine(null);
        onBlur?.();
      }
    },
    [onBlur],
  );

  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // If user clicks on the empty area below all lines, activate last line
      if ((e.target as HTMLElement).classList.contains('live-editor-body')) {
        const lastIdx = lines.length - 1;
        pendingCursorRef.current = { line: lastIdx, col: lines[lastIdx].length };
        setActiveLine(lastIdx);
      }
    },
    [lines],
  );

  const toggleMode = useCallback(() => {
    setMode((m) => {
      if (m === 'live') {
        setActiveLine(null);
        return 'raw';
      }
      return 'live';
    });
  }, []);

  const insertEmbeds = useCallback(
    (markdowns: string[]) => {
      const current = splitLines(value);
      if (!value.trim()) {
        onChange(markdowns.join('\n'));
      } else {
        const at = activeLine !== null ? activeLine + 1 : current.length;
        const next = [...current.slice(0, at), ...markdowns, ...current.slice(at)];
        onChange(joinLines(next));
      }
      onBlur?.();
    },
    [value, onChange, onBlur, activeLine],
  );

  const handleFiles = useCallback(
    async (files: File[] | FileList) => {
      const uploaded = await uploadFiles(files);
      if (uploaded.length > 0) insertEmbeds(uploaded.map(buildMarkdownEmbed));
    },
    [uploadFiles, insertEmbeds],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const files = filesFromPaste(e);
      if (files.length > 0) { e.preventDefault(); void handleFiles(files); }
    },
    [handleFiles],
  );

  const toolbar = (
    <div className="flex justify-end items-center gap-1 px-3 py-1.5 border-b border-line">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTACHMENTS}
        className="hidden"
        onChange={(e) => { if (e.target.files) void handleFiles(e.target.files); e.target.value = ''; }}
      />
      <button
        type="button"
        aria-label="Anexar arquivo"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors px-2 py-1 rounded hover:bg-lift disabled:opacity-50"
      >
        {uploading ? <Loader2 size={11} className="animate-spin" /> : <Paperclip size={11} />}
      </button>
      <button
        type="button"
        onClick={toggleMode}
        className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors px-2 py-1 rounded hover:bg-lift"
      >
        {mode === 'live' ? <><Eye size={11} /> Live</> : <><Code size={11} /> Raw</>}
      </button>
    </div>
  );

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragging(true); },
    onDragLeave: () => setDragging(false),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); setDragging(false); void handleFiles(filesFromDrop(e)); },
  };

  const dragClass = dragging ? 'border-brand ring-1 ring-brand/40' : '';

  if (mode === 'raw') {
    return (
      <div className={`markdown-live-editor rounded-xl border border-line bg-lift overflow-hidden hover:border-brand/25 transition-colors focus-within:border-brand/40 ${dragClass}`} {...dropHandlers}>
        {toolbar}
        <textarea
          ref={rawTextareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onPaste={handlePaste}
          placeholder={placeholder}
          className="w-full bg-transparent text-ink text-sm resize-none outline-none p-3"
          style={{ minHeight, lineHeight: 1.7, fontFamily: 'inherit' }}
        />
        {uploadError && <p className="text-xs text-danger px-3 pb-2">{uploadError}</p>}
      </div>
    );
  }

  return (
    <div className={`markdown-live-editor rounded-xl border border-line bg-lift overflow-hidden hover:border-brand/25 transition-colors focus-within:border-brand/40 ${dragClass}`} {...dropHandlers}>
      {toolbar}
      <div
        className="live-editor-body"
        style={{ minHeight }}
        onClick={handleContainerClick}
      >
        {!value && activeLine === null && placeholder && (
          <div
            className="px-4 py-3 text-ink-muted text-xs cursor-text"
            onClick={() => moveTo(0, 0)}
          >
            {placeholder}
          </div>
        )}

        {lines.map((line, i) => {
          if (activeLine === i) {
            return (
              <textarea
                key={i}
                ref={activeTextareaRef}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                value={line}
                onChange={(e) => updateLine(i, e.target.value)}
                onKeyDown={(e) => handleLineKeyDown(e, i)}
                onBlur={handleLineBlur}
                onPaste={handlePaste}
                rows={1}
                className="line-active-textarea"
                style={{ overflow: 'hidden', resize: 'none' }}
              />
            );
          }

          if (!line.trim()) {
            return (
              <div
                key={i}
                className="line-blank"
                onClick={() => moveTo(i, 0)}
              />
            );
          }

          return (
            <div
              key={i}
              className="line-rendered"
              onClick={() => moveTo(i, line.length)}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{line}</ReactMarkdown>
            </div>
          );
        })}
      </div>
      {uploadError && <p className="text-xs text-danger px-3 pb-2">{uploadError}</p>}
    </div>
  );
}
