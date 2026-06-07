import { useNavigate, useSearchParams, Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, Mail, Check, AlertTriangle } from 'lucide-react';
import * as invitationsApi from '../../api/invitations.api';
import { useAuthStore } from '../../store/auth.store';

const ROLE_LABEL: Record<string, string> = {
  editor: 'Editor',
  viewer: 'Visualizador',
};

/* ── Centered card shell, matching the auth pages ── */
function Shell({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-white font-bold text-lg mb-3 shadow-lg shadow-brand/30">
            C
          </div>
          <h1 className="text-xl font-bold text-ink">Claudio</h1>
          {subtitle && <p className="text-sm text-ink-dim mt-1">{subtitle}</p>}
        </div>
        <div className="bg-surface border border-line rounded-2xl p-6 shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}

export function AcceptInvitePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  const redirectTarget = `${location.pathname}${location.search}`;

  const { data: invite, isLoading, isError } = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => invitationsApi.getInvitation(token),
    enabled: !!token,
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: () => invitationsApi.acceptInvitation(token),
    onSuccess: (space) => navigate(`/spaces/${space._id}`, { replace: true }),
  });

  if (!token) {
    return (
      <Shell subtitle="Convite inválido">
        <p className="text-sm text-ink-dim text-center">
          Link de convite incompleto. Peça um novo convite ao administrador do espaço.
        </p>
      </Shell>
    );
  }

  if (isLoading) {
    return (
      <Shell subtitle="Carregando convite…">
        <div className="flex items-center justify-center gap-2 text-ink-muted text-sm py-4">
          <Loader2 size={16} className="animate-spin" /> Verificando convite…
        </div>
      </Shell>
    );
  }

  if (isError || !invite || !invite.valid) {
    return (
      <Shell subtitle="Convite indisponível">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center">
            <AlertTriangle size={18} className="text-danger" />
          </div>
          <p className="text-sm text-ink-dim">
            Este convite não é mais válido. Ele pode ter expirado, sido revogado ou já aceito.
          </p>
          <Link
            to="/home"
            className="text-sm text-brand hover:text-brand-hi font-medium transition-colors"
          >
            Ir para o início
          </Link>
        </div>
      </Shell>
    );
  }

  const roleLabel = ROLE_LABEL[invite.role] ?? invite.role;

  // Logged in with a different account than the one invited.
  const emailMismatch =
    isAuthenticated && user?.email?.toLowerCase() !== invite.email.toLowerCase();

  return (
    <Shell subtitle="Você foi convidado">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center">
          <Mail size={20} className="text-brand" />
        </div>

        <div className="space-y-1">
          <p className="text-sm text-ink">
            {invite.inviterName ? (
              <><span className="font-semibold">{invite.inviterName}</span> convidou você</>
            ) : (
              'Você foi convidado'
            )}{' '}
            para participar de
          </p>
          <p className="text-lg font-bold text-ink">{invite.spaceName ?? 'um espaço'}</p>
          <p className="text-xs text-ink-muted">
            como {roleLabel.toLowerCase()} · convite para {invite.email}
          </p>
        </div>

        {!isAuthenticated && (
          <div className="w-full space-y-2.5 pt-1">
            <p className="text-xs text-ink-dim">
              Entre ou crie sua conta com <span className="font-medium text-ink">{invite.email}</span> para aceitar.
            </p>
            <Link
              to={`/register?redirect=${encodeURIComponent(redirectTarget)}`}
              className="block w-full px-4 py-2.5 bg-brand hover:bg-brand-hi text-white text-sm font-medium rounded-lg transition-all"
            >
              Criar conta e aceitar
            </Link>
            <Link
              to={`/login?redirect=${encodeURIComponent(redirectTarget)}`}
              className="block w-full px-4 py-2.5 bg-lift border border-line text-ink text-sm font-medium rounded-lg hover:border-brand/40 transition-all"
            >
              Já tenho conta
            </Link>
          </div>
        )}

        {emailMismatch && (
          <div className="w-full space-y-2.5 pt-1">
            <div className="flex items-start gap-2 text-left bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5">
              <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-ink-dim">
                Você está conectado como <span className="font-medium text-ink">{user?.email}</span>,
                mas este convite foi enviado para <span className="font-medium text-ink">{invite.email}</span>.
                Entre com a conta correta para aceitar.
              </p>
            </div>
            <Link
              to={`/login?redirect=${encodeURIComponent(redirectTarget)}`}
              className="block w-full px-4 py-2.5 bg-lift border border-line text-ink text-sm font-medium rounded-lg hover:border-brand/40 transition-all"
            >
              Trocar de conta
            </Link>
          </div>
        )}

        {isAuthenticated && !emailMismatch && (
          <div className="w-full pt-1">
            <button
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-brand hover:bg-brand-hi text-white text-sm font-medium rounded-lg transition-all disabled:opacity-60"
            >
              {acceptMutation.isPending
                ? <Loader2 size={15} className="animate-spin" />
                : <Check size={15} />}
              Aceitar convite
            </button>
            {acceptMutation.isError && (
              <p className="text-xs text-danger mt-2">
                Não foi possível aceitar o convite. Tente novamente.
              </p>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
