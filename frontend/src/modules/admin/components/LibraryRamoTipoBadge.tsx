import { TIPO_LABEL, type RamoTipo } from '@/modules/admin/types/library';

type Props = {
  tipo: RamoTipo;
};

const STYLES: Record<RamoTipo, string> = {
  PRINCIPAL: 'bg-blue-50 text-blue-700',
  SECUNDARIO: 'bg-violet-50 text-violet-700',
};

export function LibraryRamoTipoBadge({ tipo }: Props) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[tipo]}`}
    >
      {TIPO_LABEL[tipo]}
    </span>
  );
}
