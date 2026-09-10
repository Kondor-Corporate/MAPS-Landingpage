import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export type MapsSelectOption = {
  value: string;
  label: string;
};

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: MapsSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  'aria-label'?: string;
  className?: string;
  size?: 'default' | 'compact';
};

type DropdownCoords = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  openUp: boolean;
};

function getDropdownCoords(trigger: HTMLButtonElement): DropdownCoords {
  const rect = trigger.getBoundingClientRect();
  const gap = 6;
  const viewportPadding = 8;
  const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
  const spaceAbove = rect.top - viewportPadding;
  const preferredMax = 240;
  const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
  const maxHeight = Math.min(preferredMax, openUp ? spaceAbove - gap : spaceBelow - gap);

  return {
    top: openUp ? rect.top - gap : rect.bottom + gap,
    left: rect.left,
    width: rect.width,
    maxHeight: Math.max(maxHeight, 120),
    openUp,
  };
}

export function MapsSelect({
  id,
  value,
  onChange,
  options,
  placeholder = 'Seleccionar...',
  disabled = false,
  hasError = false,
  'aria-label': ariaLabel,
  className = '',
  size = 'default',
}: Props) {
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<DropdownCoords | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const selected = options.find((opt) => opt.value === value);
  const displayLabel = selected?.label ?? placeholder;
  const isPlaceholder = !selected;

  const selectableOptions = options.filter((opt) => opt.value !== '');

  function close() {
    setOpen(false);
    setActiveIndex(-1);
  }

  function openDropdown() {
    if (disabled || !triggerRef.current) return;
    setCoords(getDropdownCoords(triggerRef.current));
    const selectedIndex = selectableOptions.findIndex((opt) => opt.value === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  function selectOption(nextValue: string) {
    onChange(nextValue);
    close();
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      if (triggerRef.current) {
        setCoords(getDropdownCoords(triggerRef.current));
      }
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      close();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        triggerRef.current?.focus();
      }
    }

    updatePosition();
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!open) {
        openDropdown();
        return;
      }
    }

    if (!open) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((idx) => (idx + 1) % selectableOptions.length);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((idx) => (idx - 1 + selectableOptions.length) % selectableOptions.length);
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const option = selectableOptions[activeIndex];
      if (option) selectOption(option.value);
    }
  }

  const dropdown =
    open && coords
      ? createPortal(
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            style={{
              position: 'fixed',
              top: coords.openUp ? undefined : coords.top,
              bottom: coords.openUp ? window.innerHeight - coords.top : undefined,
              left: coords.left,
              width: coords.width,
              maxHeight: coords.maxHeight,
            }}
            className="maps-select-dropdown z-select overflow-auto rounded-xl border border-maps-border bg-white p-1.5 shadow-floating"
          >
            {selectableOptions.map((opt, index) => {
              const isSelected = opt.value === value;
              const isActive = index === activeIndex;

              return (
                <li key={opt.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectOption(opt.value)}
                    className={[
                      'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition',
                      isSelected
                        ? 'bg-maps-brand-soft font-medium text-maps-brand'
                        : isActive
                          ? 'bg-maps-surface text-maps-heading'
                          : 'text-maps-body hover:bg-maps-surface',
                    ].join(' ')}
                  >
                    <span>{opt.label}</span>
                    {isSelected ? (
                      <Check size={14} strokeWidth={2.25} className="shrink-0 text-maps-brand" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  const triggerPadding = size === 'compact' ? 'px-2 py-1.5 text-sm' : 'px-3 py-2.5 text-sm';

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-invalid={hasError || undefined}
        onClick={() => (open ? close() : openDropdown())}
        onKeyDown={handleTriggerKeyDown}
        className={[
          'flex w-full items-center justify-between gap-2 rounded-xl border bg-white transition',
          triggerPadding,
          'focus:border-maps-brand focus:outline-none focus:ring-2 focus:ring-maps-brand/20',
          'disabled:cursor-not-allowed disabled:opacity-60',
          hasError
            ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200/40'
            : open
              ? 'border-maps-brand ring-2 ring-maps-brand/20'
              : 'border-maps-border hover:border-maps-muted-soft',
        ].join(' ')}
      >
        <span className={isPlaceholder ? 'text-maps-muted-soft' : 'text-maps-heading'}>
          {displayLabel}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          className={[
            'shrink-0 text-maps-muted transition-transform duration-200',
            open ? 'rotate-180' : '',
          ].join(' ')}
          aria-hidden
        />
      </button>
      {dropdown}
    </div>
  );
}
