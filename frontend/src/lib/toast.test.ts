import { describe, it, expect, beforeEach, vi } from 'vitest';
import { toast } from 'sonner';
import { notifyError } from './toast';

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));

const mockToast = vi.mocked(toast);

describe('notifyError', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the backend error message when present', () => {
    notifyError(
      { response: { data: { error: { message: 'Tarefa bloqueada' } } } },
      'fallback',
    );
    expect(mockToast.error).toHaveBeenCalledWith('Tarefa bloqueada');
  });

  it('surfaces the first entry of a validation error array', () => {
    notifyError(
      { response: { data: { error: { message: ['Nome é obrigatório', 'outro'] } } } },
      'fallback',
    );
    expect(mockToast.error).toHaveBeenCalledWith('Nome é obrigatório');
  });

  it('falls back to the given message when no API message exists', () => {
    notifyError(new Error('boom'), 'Falha ao salvar.');
    expect(mockToast.error).toHaveBeenCalledWith('Falha ao salvar.');
  });
});
