import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import * as authApi from '../../api/auth.api';
import { useAuthStore } from '../../store/auth.store';
import { getApiErrorMessage } from '../../lib/errors';

type Status = 'verifying' | 'success' | 'error' | 'missing';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'missing');
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);
  // Guard against double-invocation (React 18 StrictMode mounts effects twice).
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    authApi
      .verifyEmail(token)
      .then(() => {
        setStatus('success');
        // Reflect the verified state immediately if this user is logged in.
        if (user) setUser({ ...user, emailVerified: true });
      })
      .catch((err: unknown) => {
        setStatus('error');
        setError(
          getApiErrorMessage(
            err,
            'Não foi possível verificar o e-mail. O link pode ter expirado.',
          ),
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleResend = async () => {
    if (!user?.email) return;
    try {
      await authApi.resendVerification(user.email);
      setResent(true);
    } catch {
      setResent(true); // generic response either way (anti-enumeration)
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
          <p className="text-sm text-ink-dim mt-1">Verificação de e-mail</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-line rounded-2xl p-6 shadow-2xl">
          {status === 'verifying' && (
            <div className="flex flex-col items-center text-center gap-3 py-2">
              <Loader2 size={28} className="animate-spin text-brand" />
              <p className="text-sm text-ink-dim">Verificando seu e-mail…</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center text-center gap-3 py-2">
              <CheckCircle2 size={28} className="text-s-done" />
              <p className="text-sm text-ink">E-mail verificado com sucesso!</p>
              <Link
                to="/home"
                className="text-sm text-brand hover:text-brand-hi font-medium transition-colors"
              >
                Ir para o início
              </Link>
            </div>
          )}

          {(status === 'error' || status === 'missing') && (
            <div className="flex flex-col items-center text-center gap-3 py-2">
              <XCircle size={28} className="text-danger" />
              <p className="text-sm text-ink-dim">
                {status === 'missing'
                  ? 'Link de verificação inválido ou incompleto.'
                  : error}
              </p>
              {user?.email && !resent && (
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-sm text-brand hover:text-brand-hi font-medium transition-colors"
                >
                  Reenviar e-mail de verificação
                </button>
              )}
              {resent && (
                <p className="text-xs text-ink-muted">
                  Se o e-mail estiver cadastrado e ainda não verificado,
                  enviamos um novo link.
                </p>
              )}
            </div>
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
