interface Props {
  user: { displayName: string; avatarUrl: string | null };
  size?: 'sm' | 'md';
  className?: string;
}

const sizeClasses = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-20 h-20 text-xl',
};

export function UserAvatar({ user, size = 'sm', className = '' }: Props) {
  const initials = user.displayName
    ? user.displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const base = `${sizeClasses[size]} rounded-full shrink-0 ${className}`;

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.displayName}
        className={`${base} object-cover`}
      />
    );
  }

  return (
    <div className={`${base} bg-brand/20 text-brand font-bold flex items-center justify-center`}>
      {initials}
    </div>
  );
}
