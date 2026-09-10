import { FileText } from 'lucide-react';

type Props = {
  bio: string | null;
  onEdit?: () => void;
  emptyMessage?: string;
};

function splitBioParagraphs(bio: string): string[] {
  return bio
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function ProfileTrajectorySection({ bio, onEdit, emptyMessage }: Props) {
  const paragraphs = bio ? splitBioParagraphs(bio) : [];

  return (
    <section className="rounded-2xl border border-maps-border bg-white p-8 shadow-profile">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <FileText className="size-5 text-maps-brand" aria-hidden />
        Trayectoria profesional
      </h2>
      {paragraphs.length > 0 ? (
        <div className="mt-6 flex flex-col gap-4">
          {paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-base leading-relaxed text-slate-600">
              {paragraph}
            </p>
          ))}
        </div>
      ) : emptyMessage ? (
        <p className="mt-6 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <p className="mt-6 text-sm text-slate-500">
          Completá tu trayectoria en{' '}
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="font-medium text-maps-brand hover:underline"
            >
              Editar Perfil
            </button>
          ) : (
            'Editar Perfil'
          )}
          .
        </p>
      )}
    </section>
  );
}
