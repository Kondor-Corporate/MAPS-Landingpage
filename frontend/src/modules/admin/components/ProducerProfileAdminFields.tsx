type Props = {
  matricula: string;
  tituloProfesional: string;
  verificado: boolean;
  anosExperiencia: string;
  clientesActivos: string;
  errors?: Partial<{
    anosExperiencia: string;
    clientesActivos: string;
  }>;
  onChange: (patch: Partial<{
    matricula: string;
    tituloProfesional: string;
    verificado: boolean;
    anosExperiencia: string;
    clientesActivos: string;
  }>) => void;
};

const inputClasses =
  'w-full rounded-lg border border-maps-border bg-white px-3 py-2 text-sm text-maps-heading transition focus:border-maps-brand focus:outline-none focus:ring-2 focus:ring-maps-brand/20';

export function ProducerProfileAdminFields({
  matricula,
  tituloProfesional,
  verificado,
  anosExperiencia,
  clientesActivos,
  errors,
  onChange,
}: Props) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-xl border border-maps-border p-4">
      <legend className="px-1 text-sm font-semibold text-maps-heading">
        Perfil profesional (admin)
      </legend>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-maps-muted">
            Matrícula
          </span>
          <input
            type="text"
            value={matricula}
            onChange={(e) => onChange({ matricula: e.target.value })}
            className={inputClasses}
            placeholder="78429"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-maps-muted">
            Título profesional
          </span>
          <input
            type="text"
            value={tituloProfesional}
            onChange={(e) => onChange({ tituloProfesional: e.target.value })}
            className={inputClasses}
            placeholder="Productor de Seguros"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-maps-muted">
            Años de experiencia
          </span>
          <input
            type="number"
            min={0}
            value={anosExperiencia}
            onChange={(e) => onChange({ anosExperiencia: e.target.value })}
            className={inputClasses}
          />
          {errors?.anosExperiencia ? (
            <span className="text-xs text-rose-600">{errors.anosExperiencia}</span>
          ) : null}
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-maps-muted">
            Clientes activos
          </span>
          <input
            type="number"
            min={0}
            value={clientesActivos}
            onChange={(e) => onChange({ clientesActivos: e.target.value })}
            className={inputClasses}
          />
          {errors?.clientesActivos ? (
            <span className="text-xs text-rose-600">{errors.clientesActivos}</span>
          ) : null}
        </label>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-maps-heading">
        <input
          type="checkbox"
          checked={verificado}
          onChange={(e) => onChange({ verificado: e.target.checked })}
          className="size-4 rounded border-maps-border"
        />
        Productor verificado
      </label>
    </fieldset>
  );
}
