import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { useConfirm } from './useConfirm';
import { ConfirmProvider } from '../components/ui/ConfirmProvider';

function Harness({ onResult }: { onResult: (v: boolean) => void }) {
  const confirm = useConfirm();
  return (
    <button onClick={async () => onResult(await confirm({ title: 'Tem certeza?' }))}>
      trigger
    </button>
  );
}

function renderHarness(onResult: (v: boolean) => void) {
  return render(
    <ConfirmProvider>
      <Harness onResult={onResult} />
    </ConfirmProvider>,
  );
}

describe('useConfirm', () => {
  it('shows the dialog with the requested title when confirm() is called', async () => {
    renderHarness(vi.fn());
    fireEvent.click(screen.getByText('trigger'));
    expect(await screen.findByText('Tem certeza?')).toBeInTheDocument();
  });

  it('resolves true when the user confirms', async () => {
    const onResult = vi.fn();
    renderHarness(onResult);
    fireEvent.click(screen.getByText('trigger'));
    fireEvent.click(await screen.findByRole('button', { name: /confirmar/i }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
  });

  it('resolves false when the user cancels', async () => {
    const onResult = vi.fn();
    renderHarness(onResult);
    fireEvent.click(screen.getByText('trigger'));
    fireEvent.click(await screen.findByRole('button', { name: /cancelar/i }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });

  it('closes the dialog after a decision', async () => {
    renderHarness(vi.fn());
    fireEvent.click(screen.getByText('trigger'));
    fireEvent.click(await screen.findByRole('button', { name: /confirmar/i }));
    await waitFor(() => expect(screen.queryByText('Tem certeza?')).not.toBeInTheDocument());
  });
});
