/**
 * Mapeo entre DTOs de la API y el modelo UI del admin de Noticias.
 * Traduce audiencia/visibilidad, estados editoriales y filtros client-side.
 */
import type { NewsFilters } from '@/modules/admin/hooks/useNewsFilters';
import type {
  News,
  NewsAudiencia,
  NewsCategoria,
  NewsGaleriaImagen,
  NewsInput,
} from '@/modules/admin/types/news';

export type ApiNewsVisibilidad = 'PUBLICA' | 'INTERNA' | 'AMBAS';

export type ApiNoticiaImagen = {
  id: number;
  url: string;
  orden: number;
};

export type ApiNews = {
  id: number;
  titulo: string;
  slug: string;
  descripcion: string | null;
  contenido: string;
  categoria: NewsCategoria;
  imagenUrl: string | null;
  galeria?: ApiNoticiaImagen[];
  publicada: boolean;
  publicadaEn: string | null;
  visibilidad: ApiNewsVisibilidad;
  autorId: number;
  createdAt: string;
  updatedAt: string;
};

export type ApiNewsCreatePayload = {
  titulo: string;
  contenido: string;
  categoria: NewsCategoria;
  visibilidad: ApiNewsVisibilidad;
  descripcion?: string | null;
  publicada?: boolean;
};

export type ApiNewsUpdatePayload = Partial<ApiNewsCreatePayload>;

export type ListNewsApiParams = {
  publicada?: boolean;
  visibilidad?: ApiNewsVisibilidad;
  categoria?: NewsCategoria;
  q?: string;
  page?: number;
  limit?: number;
};

function audienciaToVisibilidad(audiencia: NewsAudiencia): ApiNewsVisibilidad {
  if (audiencia === 'AMBOS') return 'AMBAS';
  return audiencia === 'PUBLICO' ? 'PUBLICA' : 'INTERNA';
}

function visibilidadToAudiencia(visibilidad: ApiNewsVisibilidad): NewsAudiencia {
  if (visibilidad === 'AMBAS') return 'AMBOS';
  return visibilidad === 'PUBLICA' ? 'PUBLICO' : 'PRODUCTORES';
}

/** Deriva el estado UI a partir de flags persistidos en API (DESPUBLICADA no existe en backend). */
function resolveUiEstado(publicada: boolean, publicadaEn: string | null): News['estado'] {
  if (publicada) return 'PUBLICADO';
  if (publicadaEn != null) return 'DESPUBLICADA';
  return 'BORRADOR';
}

function mapApiGaleria(galeria?: ApiNoticiaImagen[]): NewsGaleriaImagen[] {
  if (!galeria) return [];
  return galeria.map((img) => ({ id: img.id, url: img.url, orden: img.orden }));
}

export function mapApiNewsToUiNews(dto: ApiNews): News {
  return {
    id: String(dto.id),
    titulo: dto.titulo,
    categoria: dto.categoria,
    audiencia: visibilidadToAudiencia(dto.visibilidad),
    estado: resolveUiEstado(dto.publicada, dto.publicadaEn),
    cuerpo: dto.contenido,
    imagenPortada: dto.imagenUrl,
    galeria: mapApiGaleria(dto.galeria),
    fechaPublicacion: dto.publicadaEn ?? dto.createdAt,
    ultimaModificacion: dto.updatedAt,
  };
}

export function mapUiNewsToCreatePayload(input: NewsInput, publicada: boolean): ApiNewsCreatePayload {
  return {
    titulo: input.titulo,
    contenido: input.cuerpo,
    categoria: input.categoria,
    visibilidad: audienciaToVisibilidad(input.audiencia),
    publicada,
  };
}

export function mapUiNewsToUpdatePayload(input: NewsInput, publicada: boolean): ApiNewsUpdatePayload {
  return mapUiNewsToCreatePayload(input, publicada);
}

export function mapNewsFiltersToApiParams(filters: NewsFilters): ListNewsApiParams {
  const params: ListNewsApiParams = {};

  if (filters.estado === 'PUBLICADO') params.publicada = true;
  // BORRADOR y DESPUBLICADA comparten publicada=false en API; distinguir en cliente.
  if (filters.estado === 'BORRADOR' || filters.estado === 'DESPUBLICADA') params.publicada = false;
  if (filters.audiencia === 'PUBLICO') params.visibilidad = 'PUBLICA';
  if (filters.audiencia === 'PRODUCTORES') params.visibilidad = 'INTERNA';
  if (filters.audiencia === 'AMBOS') params.visibilidad = 'AMBAS';
  if (filters.categoria !== 'TODOS') params.categoria = filters.categoria;

  return params;
}
