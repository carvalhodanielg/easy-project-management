interface Props {
  user: { displayName: string; avatarUrl: string | null };
  size?: 'xs' | 'sm' | 'lg' | 'md';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-7 h-7 text-xs',
  lg: 'w-8 h-8 text-xs',
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
