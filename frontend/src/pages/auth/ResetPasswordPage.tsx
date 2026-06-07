import { useState, type FormEvent } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import * as authApi from '../../api/auth.api';
import { getApiErrorMessage } from '../../lib/errors';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      navigate('/login?reset=success', { replace: true });
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(
          err,
          'Não foi possível redefinir a senha. O link pode ter expirado.',
        ),
      );
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
          <p className="text-sm text-ink-dim mt-1">Definir nova senha</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-line rounded-2xl p-6 shadow-2xl">
          {!token ? (
            <div className="flex flex-col items-center text-center gap-3">
              <p className="text-sm text-ink-dim">
                Link de redefinição inválido ou incompleto. Solicite um novo
                link para continuar.
              </p>
              <Link
                to="/forgot-password"
                className="text-sm text-brand hover:text-brand-hi font-medium transition-colors"
              >
                Solicitar novo link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-ink-dim mb-1.5">
                  Nova senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoFocus
                    placeholder="Mínimo 8 caracteres"
                    className="w-full px-3 py-2.5 pr-10 bg-input border border-line rounded-lg text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-dim transition-colors"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-ink-dim mb-1.5">
                  Confirmar senha
                </label>
                <input
                  id="confirm"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Repita a senha"
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
                {loading ? 'Redefinindo…' : 'Redefinir senha'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-ink-dim mt-5">
          <Link to="/login" className="text-brand hover:text-brand-hi font-medium transition-colors">
            Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}
