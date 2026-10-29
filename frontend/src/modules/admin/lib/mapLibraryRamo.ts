import type { Ramo, RamoIcono, RamoInput, RamoTipo } from '@/modules/admin/types/library';

export type ApiLibraryRamo = {
  id: number;
  nombre: string;
  descripcion: string;
  icono: string;
  gdriveUrl: string;
  tipo: RamoTipo;
  orden: number;
  activo: boolean;
  creadoEn: string;
  modificadoEn: string;
};

export function mapApiRamoToUi(dto: ApiLibraryRamo): Ramo {
  return {
    id: String(dto.id),
    nombre: dto.nombre,
    descripcion: dto.descripcion,
    icono: dto.icono as RamoIcono,
    gdriveUrl: dto.gdriveUrl,
    tipo: dto.tipo,
    orden: dto.orden,
    activo: dto.activo,
    creadoEn: dto.creadoEn,
    modificadoEn: dto.modificadoEn,
  };
}

export function mapUiRamoToApi(input: RamoInput) {
  return {
    nombre: input.nombre,
    descripcion: input.descripcion,
    icono: input.icono,
    gdriveUrl: input.gdriveUrl,
    tipo: input.tipo,
    orden: input.orden,
    activo: input.activo,
  };
}
