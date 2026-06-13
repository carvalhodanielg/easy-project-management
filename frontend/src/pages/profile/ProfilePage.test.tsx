import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProfilePage } from './ProfilePage';
import * as usersApi from '../../api/users.api';
import * as authStore from '../../store/auth.store';
import type { User } from '../../types/user.types';

vi.mock('../../api/users.api');
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockSetUser = vi.fn();
const baseUser: User = {
  _id: 'user-1',
  email: 'alice@example.com',
  displayName: 'Alice',
  avatarUrl: null,
};

function mockAuthStore(user = baseUser) {
  vi.spyOn(authStore, 'useAuthStore').mockReturnValue({
    user,
    setUser: mockSetUser,
    token: 'tok',
    setAuth: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: () => true,
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  );
}

function selectFile(file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
  return file;
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthStore();
    // mock URL.createObjectURL / revokeObjectURL (not available in jsdom)
    Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:preview'), configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
  });

  it('renders a back button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /voltar/i })).toBeInTheDocument();
  });

  it('navigates back when back button is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('renders current displayName in input', () => {
    renderPage();
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
  });

  it('renders initials when avatarUrl is null', () => {
    renderPage();
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders avatar image when avatarUrl is set', () => {
    mockAuthStore({ ...baseUser, avatarUrl: 'https://pub.r2.dev/avatars/uuid.jpg' });
    renderPage();
    const img = screen.getByRole('img', { name: /alice/i });
    expect(img).toHaveAttribute('src', 'https://pub.r2.dev/avatars/uuid.jpg');
  });

  it('calls updateMe when display name form is submitted', async () => {
    vi.mocked(usersApi.updateMe).mockResolvedValue({ ...baseUser, displayName: 'Alice B' });
    renderPage();

    fireEvent.change(screen.getByDisplayValue('Alice'), { target: { value: 'Alice B' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar nome/i }));

    await waitFor(() => {
      expect(usersApi.updateMe).toHaveBeenCalledWith({ displayName: 'Alice B' });
    });
  });

  it('calls setUser with updated user after displayName save', async () => {
    const updated = { ...baseUser, displayName: 'Alice B' };
    vi.mocked(usersApi.updateMe).mockResolvedValue(updated);
    renderPage();

    fireEvent.change(screen.getByDisplayValue('Alice'), { target: { value: 'Alice B' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar nome/i }));

    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith(updated);
    });
  });

  it('shows error when updateMe fails', async () => {
    vi.mocked(usersApi.updateMe).mockRejectedValue(new Error('Server error'));
    renderPage();

    fireEvent.change(screen.getByDisplayValue('Alice'), { target: { value: 'Alice B' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar nome/i }));

    await waitFor(() => {
      expect(screen.getByText(/erro ao salvar/i)).toBeInTheDocument();
    });
  });

  // --- Avatar preview modal ---

  it('opens preview modal when file is selected', () => {
    renderPage();
    selectFile();
    expect(screen.getByRole('dialog', { name: /preview/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /preview/i })).toHaveAttribute('src', 'blob:preview');
  });

  it('does not call uploadAvatar on file selection — only on modal save', () => {
    renderPage();
    selectFile();
    expect(usersApi.uploadAvatar).not.toHaveBeenCalled();
  });

  it('calls uploadAvatar when save button in modal is clicked', async () => {
    vi.mocked(usersApi.uploadAvatar).mockResolvedValue({
      ...baseUser,
      avatarUrl: 'https://pub.r2.dev/avatars/uuid.jpg',
    });
    renderPage();
    const file = selectFile();
    fireEvent.click(screen.getByRole('button', { name: /salvar foto/i }));

    await waitFor(() => {
      expect(usersApi.uploadAvatar).toHaveBeenCalledWith(file);
    });
  });

  it('calls setUser with updated user after avatar upload', async () => {
    const updated = { ...baseUser, avatarUrl: 'https://pub.r2.dev/avatars/uuid.jpg' };
    vi.mocked(usersApi.uploadAvatar).mockResolvedValue(updated);
    renderPage();
    selectFile();
    fireEvent.click(screen.getByRole('button', { name: /salvar foto/i }));

    await waitFor(() => {
      expect(mockSetUser).toHaveBeenCalledWith(updated);
    });
  });

  it('closes modal after successful upload', async () => {
    vi.mocked(usersApi.uploadAvatar).mockResolvedValue({
      ...baseUser,
      avatarUrl: 'https://pub.r2.dev/avatars/uuid.jpg',
    });
    renderPage();
    selectFile();
    fireEvent.click(screen.getByRole('button', { name: /salvar foto/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /preview/i })).not.toBeInTheDocument();
    });
  });

  it('closes modal without uploading when cancel button is clicked', async () => {
    renderPage();
    selectFile();
    fireEvent.click(screen.getByText('Cancelar'));

    expect(usersApi.uploadAvatar).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: /preview/i })).not.toBeInTheDocument();
  });

  it('closes modal without uploading when clicking the backdrop', () => {
    renderPage();
    selectFile();
    fireEvent.click(screen.getByRole('dialog', { name: /preview/i }));

    expect(usersApi.uploadAvatar).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: /preview/i })).not.toBeInTheDocument();
  });

  it('does not close modal when clicking inside its content', () => {
    renderPage();
    selectFile();
    fireEvent.click(screen.getByRole('img', { name: /preview/i }));

    expect(screen.getByRole('dialog', { name: /preview/i })).toBeInTheDocument();
  });

  it('shows error in modal when upload fails', async () => {
    vi.mocked(usersApi.uploadAvatar).mockRejectedValue(new Error('Upload failed'));
    renderPage();
    selectFile();
    fireEvent.click(screen.getByRole('button', { name: /salvar foto/i }));

    await waitFor(() => {
      expect(screen.getByText(/erro ao enviar/i)).toBeInTheDocument();
    });
  });
});
