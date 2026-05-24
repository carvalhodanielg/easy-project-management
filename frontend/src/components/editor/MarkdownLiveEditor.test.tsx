import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { flushSync } from 'react-dom';
import { MarkdownLiveEditor } from './MarkdownLiveEditor';

describe('MarkdownLiveEditor', () => {
  it('renders in live mode by default with Live toggle button', () => {
    render(<MarkdownLiveEditor value="" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /live/i })).toBeInTheDocument();
  });

  it('shows placeholder when empty and unfocused', () => {
    render(<MarkdownLiveEditor value="" onChange={vi.fn()} placeholder="Add description…" />);
    expect(screen.getByText('Add description…')).toBeInTheDocument();
  });

  it('renders heading HTML when not focused (live mode)', () => {
    render(<MarkdownLiveEditor value="# Hello" onChange={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('shows a textarea for the active line when clicked', () => {
    render(<MarkdownLiveEditor value="# Hello\nWorld" onChange={vi.fn()} />);
    const heading = screen.getByRole('heading', { level: 1 });
    flushSync(() => { fireEvent.click(heading); });
    expect(document.querySelector('.line-active-textarea')).toBeInTheDocument();
  });

  it('active-line textarea contains the raw markdown of that line', () => {
    render(<MarkdownLiveEditor value={'# Hello\nWorld'} onChange={vi.fn()} />);
    const heading = screen.getByRole('heading', { level: 1 });
    flushSync(() => { fireEvent.click(heading); });
    const ta = document.querySelector<HTMLTextAreaElement>('.line-active-textarea')!;
    expect(ta.value).toBe('# Hello');
  });

  it('calls onChange when typing in active line', () => {
    const onChange = vi.fn();
    render(<MarkdownLiveEditor value={'# Hello\nWorld'} onChange={onChange} />);
    const heading = screen.getByRole('heading', { level: 1 });
    flushSync(() => { fireEvent.click(heading); });
    const ta = document.querySelector<HTMLTextAreaElement>('.line-active-textarea')!;
    fireEvent.change(ta, { target: { value: '# Hi' } });
    expect(onChange).toHaveBeenCalledWith('# Hi\nWorld');
  });

  it('pressing ArrowDown moves active line to next line', () => {
    render(<MarkdownLiveEditor value={'line1\nline2'} onChange={vi.fn()} />);
    const firstRendered = screen.getAllByText(/line1|line2/)[0].closest('.line-rendered')!;
    flushSync(() => { fireEvent.click(firstRendered); });
    const ta = document.querySelector<HTMLTextAreaElement>('.line-active-textarea')!;
    flushSync(() => {
      fireEvent.keyDown(ta, { key: 'ArrowDown' });
    });
    const newTa = document.querySelector<HTMLTextAreaElement>('.line-active-textarea')!;
    expect(newTa.value).toBe('line2');
  });

  it('pressing ArrowUp moves active line to previous line', () => {
    render(<MarkdownLiveEditor value={'line1\nline2'} onChange={vi.fn()} />);
    // Click on second rendered line (line2 is a paragraph)
    const allRendered = document.querySelectorAll('.line-rendered');
    flushSync(() => { fireEvent.click(allRendered[1]); });
    const ta = document.querySelector<HTMLTextAreaElement>('.line-active-textarea')!;
    flushSync(() => {
      fireEvent.keyDown(ta, { key: 'ArrowUp' });
    });
    const newTa = document.querySelector<HTMLTextAreaElement>('.line-active-textarea')!;
    expect(newTa.value).toBe('line1');
  });

  it('pressing Enter splits the line', () => {
    const onChange = vi.fn();
    render(<MarkdownLiveEditor value={'helloworld'} onChange={onChange} />);
    const rendered = document.querySelector('.line-rendered')!;
    flushSync(() => { fireEvent.click(rendered); });
    const ta = document.querySelector<HTMLTextAreaElement>('.line-active-textarea')!;
    // Simulate cursor at position 5 (between "hello" and "world")
    Object.defineProperty(ta, 'selectionStart', { get: () => 5, configurable: true });
    flushSync(() => {
      fireEvent.keyDown(ta, { key: 'Enter' });
    });
    expect(onChange).toHaveBeenCalledWith('hello\nworld');
  });

  it('pressing Backspace at start of line merges with previous', () => {
    const onChange = vi.fn();
    render(<MarkdownLiveEditor value={'line1\nline2'} onChange={onChange} />);
    const secondRendered = document.querySelectorAll('.line-rendered')[1];
    flushSync(() => { fireEvent.click(secondRendered); });
    const ta = document.querySelector<HTMLTextAreaElement>('.line-active-textarea')!;
    Object.defineProperty(ta, 'selectionStart', { get: () => 0, configurable: true });
    flushSync(() => {
      fireEvent.keyDown(ta, { key: 'Backspace' });
    });
    expect(onChange).toHaveBeenCalledWith('line1line2');
  });

  it('pressing Tab inserts 2 spaces', () => {
    const onChange = vi.fn();
    render(<MarkdownLiveEditor value={'hello'} onChange={onChange} />);
    const rendered = document.querySelector('.line-rendered')!;
    flushSync(() => { fireEvent.click(rendered); });
    const ta = document.querySelector<HTMLTextAreaElement>('.line-active-textarea')!;
    Object.defineProperty(ta, 'selectionStart', { get: () => 5, configurable: true });
    flushSync(() => {
      fireEvent.keyDown(ta, { key: 'Tab' });
    });
    expect(onChange).toHaveBeenCalledWith('hello  ');
  });

  it('switches to raw mode and shows a single textarea', async () => {
    render(<MarkdownLiveEditor value="# Hello" onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /live/i }));
    expect(screen.getByRole('textbox')).toHaveValue('# Hello');
  });

  it('switches back to live mode', async () => {
    render(<MarkdownLiveEditor value="" onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /live/i }));
    await userEvent.click(screen.getByRole('button', { name: /raw/i }));
    expect(screen.getByRole('button', { name: /live/i })).toBeInTheDocument();
  });

  it('calls onBlur when Escape is pressed', () => {
    const onBlur = vi.fn();
    render(<MarkdownLiveEditor value={'hello'} onChange={vi.fn()} onBlur={onBlur} />);
    const rendered = document.querySelector('.line-rendered')!;
    flushSync(() => { fireEvent.click(rendered); });
    const ta = document.querySelector<HTMLTextAreaElement>('.line-active-textarea')!;
    flushSync(() => { fireEvent.keyDown(ta, { key: 'Escape' }); });
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});
