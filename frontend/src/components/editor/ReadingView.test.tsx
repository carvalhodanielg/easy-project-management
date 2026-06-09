import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ReadingView } from './ReadingView';

const navigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));

function renderView(value: string) {
  return render(
    <MemoryRouter>
      <ReadingView value={value} spaceId="sp1" placeholder="vazio" />
    </MemoryRouter>,
  );
}

describe('ReadingView', () => {
  beforeEach(() => navigate.mockClear());

  it('shows the placeholder when empty', () => {
    renderView('   ');
    expect(screen.getByText('vazio')).toBeInTheDocument();
  });

  it('renders markdown as HTML', () => {
    renderView('# Título');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Título');
  });

  it('navigates to the task route when a task ref is clicked', () => {
    renderView('ver [Login](task:t1)');
    fireEvent.click(screen.getByText('Login'));
    expect(navigate).toHaveBeenCalledWith('/spaces/sp1/tasks/t1');
  });

  it('renders a mention as a non-navigating chip', () => {
    renderView('oi [@Daniel](mention:u1)');
    const chip = screen.getByText('@Daniel');
    expect(chip.tagName).toBe('SPAN');
    expect(chip).toHaveClass('md-ref-mention');
  });
});
