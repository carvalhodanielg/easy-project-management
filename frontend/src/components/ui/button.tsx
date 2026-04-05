import * as React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'outline' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'xs' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 font-medium transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed',
          {
            default:     'bg-brand hover:bg-brand-hi text-white rounded-lg shadow-sm',
            ghost:       'text-ink-dim hover:text-ink hover:bg-lift rounded-lg',
            outline:     'border border-line text-ink-dim hover:border-brand/40 hover:text-ink bg-transparent rounded-lg',
            destructive: 'bg-danger/15 hover:bg-danger/25 text-danger border border-danger/20 rounded-lg',
            secondary:   'bg-lift hover:bg-lift/80 text-ink border border-line rounded-lg',
          }[variant],
          {
            default: 'px-3.5 py-2 text-sm',
            sm:      'px-3 py-1.5 text-xs',
            xs:      'px-2 py-1 text-xs',
            icon:    'w-8 h-8',
          }[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
