import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { updateMe, uploadAvatar } from '../../api/users.api';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { useTheme } from '../../hooks/useTheme';
import { useModalA11y } from '../../hooks/useModalA11y';
import type { ThemeMode } from '../../types/user.types';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [namePending, setNamePending] = useState(false);
  const [nameError, setNameError] = useState('');

  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarPending, setAvatarPending] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setNamePending(true);
    setNameError('');
    try {
      const updated = await updateMe({ displayName });
      setUser(updated);
    } catch {
      setNameError('Erro ao salvar nome.');
    } finally {
      setNamePending(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setAvatarError('');
  }

  function closeModal() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSaveAvatar() {
    if (!previewFile) return;
    setAvatarPending(true);
    setAvatarError('');
    try {
      const updated = await uploadAvatar(previewFile);
      setUser(updated);
      closeModal();
    } catch {
      setAvatarError('Erro ao enviar imagem.');
    } finally {
      setAvatarPending(false);
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-base flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-md bg-surface border border-line rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Voltar"
            className="text-ink-muted hover:text-ink transition-colors"
          >
            ←
          </button>
          <h1 className="text-lg font-semibold text-ink">Perfil</h1>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative group"
            aria-label="Alterar avatar"
          >
            <UserAvatar user={user} size="md" />
            <span className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
              Alterar
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Display name */}
        <form onSubmit={handleSaveName} className="flex flex-col gap-3">
          <label className="text-sm text-ink-dim font-medium" htmlFor="displayName">
            Nome
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-base border border-line text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/50"
          />
          {nameError && (
            <p className="text-xs text-danger">{nameError}</p>
          )}
          <button
            type="submit"
            disabled={namePending || displayName.trim() === ''}
            aria-label="Salvar nome"
            className="self-end px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hi transition-colors disabled:opacity-50"
          >
            {namePending ? 'Salvando...' : 'Salvar'}
          </button>
        </form>

        {/* Appearance */}
        <div className="mt-6 pt-4 border-t border-line flex flex-col gap-3">
          <span className="text-sm text-ink-dim font-medium">Aparência</span>
          <div
            role="radiogroup"
            aria-label="Tema"
            className="grid grid-cols-2 gap-2"
          >
            {([
              { value: 'light', label: 'Claro', Icon: Sun },
              { value: 'dark', label: 'Escuro', Icon: Moon },
            ] as { value: ThemeMode; label: string; Icon: typeof Sun }[]).map(
              ({ value, label, Icon }) => {
                const active = theme === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTheme(value)}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                      active
                        ? 'border-brand bg-brand/10 text-ink'
                        : 'border-line text-ink-dim hover:bg-lift'
                    }`}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                );
              },
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-line">
          <p className="text-xs text-ink-muted">{user.email}</p>
        </div>
      </div>

      {/* Avatar preview modal */}
      {previewUrl && (
        <AvatarPreviewModal
          previewUrl={previewUrl}
          error={avatarError}
          pending={avatarPending}
          onClose={closeModal}
          onSave={handleSaveAvatar}
        />
      )}
    </div>
  );
}

interface AvatarPreviewModalProps {
  previewUrl: string;
  error?: string;
  pending: boolean;
  onClose: () => void;
  onSave: () => void;
}

function AvatarPreviewModal({ previewUrl, error, pending, onClose, onSave }: AvatarPreviewModalProps) {
  const dialogRef = useModalA11y<HTMLDivElement>(onClose);

  return (
    <div
      data-testid="avatar-modal-backdrop"
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Preview de avatar"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-line rounded-2xl p-6 w-full max-w-80 flex flex-col items-center gap-4 shadow-xl focus:outline-none"
      >
        <div className="flex items-center justify-between w-full">
          <h2 className="text-sm font-semibold text-ink">Confirmar foto</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="text-ink-muted hover:text-ink transition-colors"
          >
            ✕
          </button>
        </div>

        <img
          src={previewUrl}
          alt="Preview de avatar"
          className="w-32 h-32 rounded-full object-cover border-2 border-line"
        />

        {error && (
          <p className="text-xs text-danger text-center">{error}</p>
        )}

        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex-1 px-4 py-2 rounded-lg border border-line text-sm text-ink hover:bg-base transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            aria-label="Salvar foto"
            className="flex-1 px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hi transition-colors disabled:opacity-50"
          >
            {pending ? 'Enviando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
