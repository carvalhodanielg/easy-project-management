import { describe, it, expect, vi, afterEach } from 'vitest';
import { CircleDot, CheckCircle2, Clock } from 'lucide-react';
import { sprintDisplayStatus, sprintStatusKey } from './sprintStatus';
import type { Sprint } from '../api/sprints.api';

const NOW = new Date('2026-06-08T12:00:00.000Z').getTime();

function makeSprint(overrides: Partial<Sprint>): Sprint {
  return {
    _id: 's1',
    spaceId: 'sp1',
    folderId: null,
    number: 1,
    folderNumber: null,
    name: 'Sprint de teste',
    startDate: '2026-06-01T00:00:00.000Z',
    endDate: '2026-06-15T00:00:00.000Z',
    status: 'active',
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('sprintDisplayStatus', () => {
  it('marks a sprint whose window contains now as "Em progresso"', () => {
    vi.setSystemTime(NOW);
    const ds = sprintDisplayStatus(makeSprint({ status: 'active' }));
    expect(ds.label).toBe('Em progresso');
    expect(ds.Icon).toBe(CircleDot);
    expect(ds.color).toBe('text-s-done');
  });

  it('marks a completed sprint as "Concluída"', () => {
    vi.setSystemTime(NOW);
    const ds = sprintDisplayStatus(makeSprint({ status: 'completed' }));
    expect(ds.label).toBe('Concluída');
    expect(ds.Icon).toBe(CheckCircle2);
    expect(ds.color).toBe('text-ink-muted');
  });

  it('marks a sprint whose end is in the past as "Concluída" even if not flagged', () => {
    vi.setSystemTime(NOW);
    const ds = sprintDisplayStatus(
      makeSprint({
        status: 'active',
        startDate: '2026-05-01T00:00:00.000Z',
        endDate: '2026-05-20T00:00:00.000Z',
      }),
    );
    expect(ds.label).toBe('Concluída');
    expect(ds.Icon).toBe(CheckCircle2);
  });

  it('marks a sprint that starts in the future as "Planejamento"', () => {
    vi.setSystemTime(NOW);
    const ds = sprintDisplayStatus(
      makeSprint({
        status: 'planning',
        startDate: '2026-07-01T00:00:00.000Z',
        endDate: '2026-07-15T00:00:00.000Z',
      }),
    );
    expect(ds.label).toBe('Planejamento');
    expect(ds.Icon).toBe(Clock);
    expect(ds.color).toBe('text-s-review');
  });
});

describe('sprintStatusKey', () => {
  it('derives "active" when now is inside the window, ignoring a raw planning flag', () => {
    vi.setSystemTime(NOW);
    expect(sprintStatusKey(makeSprint({ status: 'planning' }))).toBe('active');
  });

  it('derives "completed" when the end date is in the past, ignoring a raw planning flag', () => {
    vi.setSystemTime(NOW);
    expect(
      sprintStatusKey(
        makeSprint({
          status: 'planning',
          startDate: '2026-05-01T00:00:00.000Z',
          endDate: '2026-05-20T00:00:00.000Z',
        }),
      ),
    ).toBe('completed');
  });

  it('derives "planning" when the window is entirely in the future', () => {
    vi.setSystemTime(NOW);
    expect(
      sprintStatusKey(
        makeSprint({
          status: 'planning',
          startDate: '2026-07-01T00:00:00.000Z',
          endDate: '2026-07-15T00:00:00.000Z',
        }),
      ),
    ).toBe('planning');
  });
});
