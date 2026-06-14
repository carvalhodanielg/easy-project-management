import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ParentTaskPickerModal } from './ParentTaskPickerModal';
import type { Task } from '../../types/task.types';

const TASK: Task = {
  _id: 't1',
  name: 'Tarefa Pai',
  status: 'pendente',
  priority: 'normal',
  storyPoints: null,
  dueDate: null,
  assignees: [],
  tags: [],
  subtaskCount: 0,
  blockedBy: [],
  blocks: [],
  description: '',
  parentTask: null,
  isEpic: false,
  epicId: null,
  listId: 'l1',
  sprintId: null,
  spaceId: 'sp1',
  position: 0,
  createdBy: 'u1',
  startDate: null,
  createdAt: '',
  updatedAt: '',
};

function renderModal() {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(
    <ParentTaskPickerModal
      title="Escolher tarefa pai"
      tasks={[TASK]}
      onConfirm={onConfirm}
      onClose={onClose}
    />,
  );
  return { onConfirm, onClose };
}

describe('ParentTaskPickerModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('closes when clicking the backdrop', () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByTestId('parent-task-picker-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close when clicking inside the modal content', () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByText('Escolher tarefa pai'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
