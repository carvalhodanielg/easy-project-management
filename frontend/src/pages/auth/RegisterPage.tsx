import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import * as authApi from '../../api/auth.api';

export function RegisterPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect');
  // Invitations are addressed to a specific email — when arriving from an invite
  // link the email is fixed and must not be edited.
  const lockedEmail = params.get('email');
  const setAuth  = useAuthStore((s) => s.setAuth);

  const [displayName, setDisplayName] = useState('');
  const [email,       setEmail]       = useState(lockedEmail ?? '');
  const [password,    setPassword]    = useState('');
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const token = await authApi.register({ email, password, displayName });
      const user  = await authApi.getMe(token);
      setAuth(token, user);
      navigate(redirect || '/home', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string | string[] } } } })
        ?.response?.data?.error?.message;
      const detail = Array.isArray(msg) ? msg[0] : msg;
      setError(detail ?? 'Falha ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-white font-bold text-lg mb-3 shadow-lg shadow-brand/30">
            C
          </div>
          <h1 className="text-xl font-bold text-ink">Claudio</h1>
          <p className="text-sm text-ink-dim mt-1">Crie sua conta</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-line rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-ink-dim mb-1.5">
                Nome
              </label>
              <input
                id="displayName"
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                autoFocus
                placeholder="Seu nome completo"
                className="w-full px-3 py-2.5 bg-input border border-line rounded-lg text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand transition-all"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink-dim mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!!lockedEmail}
                placeholder="seu@email.com"
                className={`w-full px-3 py-2.5 bg-input border border-line rounded-lg text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand transition-all ${lockedEmail ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
              {lockedEmail && (
                <p className="text-xs text-ink-muted mt-1.5">
                  E-mail definido pelo convite.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink-dim mb-1.5">
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3 py-2.5 bg-input border border-line rounded-lg text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand transition-all"
              />
            </div>

            {error && (
              <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-hi disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-all"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Criando…' : 'Criar conta'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-ink-dim mt-5">
          Já tem conta?{' '}
          <Link to={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'} className="text-brand hover:text-brand-hi font-medium transition-colors">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
