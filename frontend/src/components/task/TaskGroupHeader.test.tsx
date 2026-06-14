import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TaskGroupHeader } from './TaskGroupHeader';

describe('TaskGroupHeader', () => {
  it('renders the epic name as the label when grouping by epic', () => {
    render(
      <TaskGroupHeader
        groupKey="Auth"
        groupBy="epic"
        count={3}
        totalStoryPoints={8}
      />,
    );
    expect(screen.getByText('Auth')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('8 pts')).toBeInTheDocument();
  });

  it('labels tasks without an epic as "Sem épico"', () => {
    render(
      <TaskGroupHeader
        groupKey={null}
        groupBy="epic"
        count={2}
        totalStoryPoints={0}
      />,
    );
    expect(screen.getByText('Sem épico')).toBeInTheDocument();
  });
});
