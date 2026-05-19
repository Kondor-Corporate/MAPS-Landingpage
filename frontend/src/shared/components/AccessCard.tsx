import type { ReactNode } from 'react';

type AccessCardProps = {
  variant: 'self' | 'library';
  title: string;
  description: string;
  ctaLabel: string;
  /** `null`: CTA deshabilitada ("Próximamente"), sin href falso. */
  href: string | null;
  badge?: string;
  badgeIcon?: ReactNode;
};

const ArrowRightIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <path
      d="M2.5 7h9M7.5 3l4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function AccessCard({
  variant,
  title,
  description,
  ctaLabel,
  href,
  badge,
  badgeIcon,
}: AccessCardProps) {
  const ctaDisabled = href == null || href === '';
  const isExternalLink = Boolean(href && /^https?:\/\//i.test(href));

  if (variant === 'self') {
    return (
      <article
        className="relative flex flex-col gap-5 overflow-hidden rounded-2xl p-7 text-white shadow-cta"
        style={{
          background:
            'linear-gradient(135deg, #1e3a8a 0%, #312e81 50%, #00a4c0 100%)',
        }}
      >
        {badge && (
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
            {badgeIcon}
            {badge}
          </span>
        )}
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold leading-tight">{title}</h2>
          <p className="text-sm leading-relaxed text-white/80">{description}</p>
        </div>
        {ctaDisabled ? (
          <span
            className="mt-auto inline-flex w-fit cursor-not-allowed items-center gap-2 rounded-lg border border-white/20 bg-white/15 px-5 py-2.5 text-sm font-bold text-white/70"
            aria-disabled="true"
          >
            Próximamente
          </span>
        ) : (
          <a
            href={href}
            {...(isExternalLink
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {})}
            className="mt-auto inline-flex w-fit items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-maps-heading transition-colors hover:bg-white/90"
          >
            {ctaLabel}
            <ArrowRightIcon />
          </a>
        )}
      </article>
    );
  }

  return (
    <article className="flex flex-col gap-5 rounded-2xl bg-white p-7 shadow-card">
      {badge && (
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-maps-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-maps-brand">
          {badgeIcon}
          {badge}
        </span>
      )}
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold leading-tight text-maps-heading">
          {title}
        </h2>
        <p className="text-sm leading-relaxed text-maps-body">{description}</p>
      </div>
      {ctaDisabled ? (
        <span
          className="mt-auto inline-flex w-fit cursor-not-allowed items-center gap-2 rounded-lg border border-maps-border bg-maps-surface px-5 py-2.5 text-sm font-bold text-maps-muted"
          aria-disabled="true"
        >
          Próximamente
        </span>
      ) : (
        <a
          href={href}
          {...(isExternalLink
            ? { target: '_blank', rel: 'noopener noreferrer' }
            : {})}
          className="mt-auto inline-flex w-fit items-center gap-2 rounded-lg bg-maps-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-maps-brand-hover"
        >
          {ctaLabel}
          <ArrowRightIcon />
        </a>
      )}
    </article>
  );
}
