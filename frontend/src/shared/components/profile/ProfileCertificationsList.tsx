import { Download, FileText, ShieldCheck, Trash2 } from 'lucide-react';
import type { ProducerCertificacion } from '@/shared/types/producerProfile';
import { formatCertificacionSize } from '@/shared/types/producerProfile';

type Props = {
  certificaciones: ProducerCertificacion[];
  emptyMessage?: string;
  onDelete?: (certId: number) => void;
  deletingId?: number | null;
};

export function ProfileCertificationsList({
  certificaciones,
  emptyMessage = 'No hay certificación cargada. Podés subir un PDF desde Editar Perfil.',
  onDelete,
  deletingId = null,
}: Props) {
  return (
    <section className="relative rounded-3xl border border-slate-100 bg-white p-6 shadow-[0px_4px_20px_-2px_rgba(0,0,0,0.05)] sm:p-8">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <ShieldCheck className="size-5 text-maps-brand" aria-hidden />
        Certificaciones
      </h2>
      {certificaciones.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-3">
          {certificaciones.map((cert) => (
            <li
              key={cert.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center text-maps-brand">
                  <FileText className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{cert.nombre}</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">
                    {formatCertificacionSize(cert.tamanoBytes)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <a
                  href={cert.archivoUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-maps-brand"
                  aria-label={`Descargar ${cert.nombre}`}
                >
                  <Download className="size-4" aria-hidden />
                </a>
                {onDelete ? (
                  <button
                    type="button"
                    onClick={() => onDelete(cert.id)}
                    disabled={deletingId === cert.id}
                    className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-rose-600 disabled:opacity-50"
                    aria-label={`Eliminar ${cert.nombre}`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-500">{emptyMessage}</p>
      )}
    </section>
  );
}
