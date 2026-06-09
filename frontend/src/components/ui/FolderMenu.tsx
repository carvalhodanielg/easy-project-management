import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface FolderMenuItem {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  danger?: boolean;
  loading?: boolean;
}

/**
 * Hover-revealed kebab (⋯) menu for a folder row in the sidebar.
 * Follows the dropdown pattern used elsewhere (SprintListPage): a relative
 * container with an outside-click listener and an absolutely positioned menu.
 */
export function FolderMenu({
  items,
  label = 'Opções da pasta',
}: {
  items: FolderMenuItem[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        aria-label={label}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={cn(
          'p-1 rounded text-ink-muted hover:text-ink hover:bg-lift transition-all',
          open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
      >
        <MoreHorizontal size={13} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-20 min-w-[170px] bg-modal border border-line rounded-lg shadow-xl py-1"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.loading}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                item.onClick();
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors disabled:opacity-60',
                item.danger
                  ? 'text-danger hover:bg-danger/10'
                  : 'text-ink-dim hover:bg-lift hover:text-ink',
              )}
            >
              {item.loading
                ? <Loader2 size={12} className="animate-spin shrink-0" />
                : <item.icon size={12} className="shrink-0" />}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
