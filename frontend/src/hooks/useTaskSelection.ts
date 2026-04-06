import { useState, useCallback } from 'react';

export type SelectionKind = 'main' | 'subtask';

export interface SelectedTask {
  id: string;
  kind: SelectionKind;
}

export type SelectionType = 'none' | 'main' | 'subtask' | 'mixed';

export interface TaskSelectionState {
  selected: Map<string, SelectionKind>;
  count: number;
  selectionType: SelectionType;
  isSelected: (id: string) => boolean;
  toggle: (id: string, kind: SelectionKind) => void;
  clear: () => void;
  selectedIds: string[];
  mainTaskIds: string[];
  subtaskIds: string[];
}

export function useTaskSelection(): TaskSelectionState {
  const [selected, setSelected] = useState<Map<string, SelectionKind>>(new Map());

  const toggle = useCallback((id: string, kind: SelectionKind) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.set(id, kind);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSelected(new Map());
  }, []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const count = selected.size;

  const kinds = Array.from(selected.values());
  const hasMain = kinds.includes('main');
  const hasSub = kinds.includes('subtask');

  let selectionType: SelectionType = 'none';
  if (count > 0) {
    if (hasMain && hasSub) selectionType = 'mixed';
    else if (hasMain) selectionType = 'main';
    else selectionType = 'subtask';
  }

  const selectedIds = Array.from(selected.keys());
  const mainTaskIds = selectedIds.filter((id) => selected.get(id) === 'main');
  const subtaskIds = selectedIds.filter((id) => selected.get(id) === 'subtask');

  return { selected, count, selectionType, isSelected, toggle, clear, selectedIds, mainTaskIds, subtaskIds };
}
