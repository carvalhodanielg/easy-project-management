import { useRef, useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view';
import { history, historyKeymap, defaultKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { autocompletion, completionKeymap, acceptCompletion } from '@codemirror/autocomplete';
import { Code, Eye, Pencil, Paperclip, Loader2 } from 'lucide-react';
import { getSpaceMembers } from '../../api/spaces.api';
import * as tasksApi from '../../api/tasks.api';
import type { User } from '../../types/user.types';
import type { SpaceMember } from '../../types/space.types';
import { buildMarkdownEmbed, ACCEPT_ATTACHMENTS } from '../../api/attachments.api';
import { useAttachmentUpload, filesFromPaste, filesFromDrop } from '../../hooks/useAttachmentUpload';
import { editorTheme, editorHighlight } from './editorTheme';
import { livePreview } from './livePreview';
import { markdownKeymap } from './markdownCommands';
import {
  mentionCompletionSource,
  taskCompletionSource,
  slashCompletionSource,
  type MentionMember,
} from './completions';
import { ReadingView } from './ReadingView';

export type EditorMode = 'live' | 'source' | 'reading';

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  spaceId: string;
  placeholder?: string;
  minHeight?: number;
  onBlur?: () => void;
}

const MODES: { mode: EditorMode; label: string; Icon: typeof Eye }[] = [
  { mode: 'live', label: 'Live', Icon: Eye },
  { mode: 'source', label: 'Código', Icon: Code },
  { mode: 'reading', label: 'Leitura', Icon: Pencil },
];

export function MarkdownEditor({
  value,
  onChange,
  spaceId,
  placeholder,
  minHeight = 120,
  onBlur,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<EditorMode>('live');
  const [dragging, setDragging] = useState(false);

  const cmRef = useRef<ReactCodeMirrorRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { uploading, error: uploadError, uploadFiles } = useAttachmentUpload();

  // Members for @-mentions. The query drives the fetch/cache; the completion
  // source reads the latest members straight from the cache so it always sees
  // fresh data without rebuilding the editor extensions.
  useQuery({
    queryKey: ['space-members', spaceId],
    queryFn: () => getSpaceMembers(spaceId),
    staleTime: 60_000,
  });
  const getMembers = useCallback<() => MentionMember[]>(
    () =>
      (queryClient.getQueryData<SpaceMember[]>(['space-members', spaceId]) ?? []).map((m) => ({
        _id: typeof m.userId === 'string' ? m.userId : (m.userId as User)._id,
        displayName: typeof m.userId === 'string' ? m.userId : (m.userId as User).displayName,
      })),
    [queryClient, spaceId],
  );

  const fetchTasks = useCallback(
    (q: string) =>
      queryClient
        .fetchQuery({
          queryKey: ['tasks-search', spaceId, q],
          queryFn: () => tasksApi.getTasks(spaceId, { q }),
          staleTime: 5_000,
        })
        .then((tasks) => tasks.map((t) => ({ _id: t._id, name: t.name }))),
    [queryClient, spaceId],
  );

  const extensions = useMemo(
    () => [
      history(),
      keymap.of([
        ...markdownKeymap,
        { key: 'Tab', run: acceptCompletion },
        ...completionKeymap,
        ...historyKeymap,
        ...defaultKeymap,
        indentWithTab,
      ]),
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      EditorView.lineWrapping,
      editorTheme,
      editorHighlight,
      autocompletion({
        icons: false,
        override: [
          mentionCompletionSource(getMembers),
          taskCompletionSource(fetchTasks),
          slashCompletionSource(),
        ],
      }),
      EditorView.domEventHandlers({ blur: () => { onBlur?.(); return false; } }),
      ...(placeholder ? [cmPlaceholder(placeholder)] : []),
      ...(mode === 'live' ? [livePreview] : []),
    ],
    [mode, fetchTasks, getMembers, placeholder, onBlur],
  );

  const insertEmbeds = useCallback(
    (markdowns: string[]) => {
      const text = markdowns.join('\n');
      const view = cmRef.current?.view;
      if (view) {
        const pos = view.state.selection.main.head;
        const needsNl = pos > 0 && view.state.doc.sliceString(pos - 1, pos) !== '\n';
        const insert = (needsNl ? '\n' : '') + text + '\n';
        view.dispatch({ changes: { from: pos, insert }, selection: { anchor: pos + insert.length } });
        view.focus();
      } else {
        onChange(value.trim() ? value + '\n' + text : text);
      }
      onBlur?.();
    },
    [value, onChange, onBlur],
  );

  const handleFiles = useCallback(
    async (files: File[] | FileList) => {
      const uploaded = await uploadFiles(files);
      if (uploaded.length > 0) insertEmbeds(uploaded.map(buildMarkdownEmbed));
    },
    [uploadFiles, insertEmbeds],
  );

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragging(true); },
    onDragLeave: () => setDragging(false),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); setDragging(false); void handleFiles(filesFromDrop(e)); },
  };

  const toolbar = (
    <div className="flex justify-between items-center gap-1 px-2 py-1.5 border-b border-line">
      <div className="flex items-center gap-0.5">
        {MODES.map(({ mode: m, label, Icon }) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
              mode === m ? 'bg-lift text-ink' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Icon size={11} /> {label}
          </button>
        ))}
      </div>
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
    </div>
  );

  const dragClass = dragging ? 'border-brand ring-1 ring-brand/40' : '';

  return (
    <div
      className={`markdown-editor rounded-xl border border-line bg-lift overflow-hidden hover:border-brand/25 transition-colors focus-within:border-brand/40 ${dragClass}`}
      {...dropHandlers}
    >
      {toolbar}
      {mode === 'reading' ? (
        <div className="px-3 py-2" style={{ minHeight }}>
          <ReadingView value={value} spaceId={spaceId} placeholder={placeholder} />
        </div>
      ) : (
        <CodeMirror
          ref={cmRef}
          value={value}
          onChange={onChange}
          extensions={extensions}
          basicSetup={false}
          minHeight={`${minHeight}px`}
          theme="none"
          onPaste={(e) => {
            const files = filesFromPaste(e);
            if (files.length > 0) { e.preventDefault(); void handleFiles(files); }
          }}
        />
      )}
      {uploadError && <p className="text-xs text-danger px-3 pb-2">{uploadError}</p>}
    </div>
  );
}
