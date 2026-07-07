/**
 * Tipos y constantes de presentación del admin de Noticias.
 * Define el shape UI (`News`), enums de dominio y labels para selects/badges.
 */
export type NewsAudiencia = 'PRODUCTORES' | 'PUBLICO';

export type NewsEstado = 'BORRADOR' | 'PUBLICADO' | 'DESPUBLICADA';

export type NewsCategoria = 'NOVEDAD' | 'EVENTO' | 'CIRCULAR' | 'PRODUCTO' | 'COMUNICADO';

export type News = {
  id: string;
  titulo: string;
  categoria: NewsCategoria;
  audiencia: NewsAudiencia;
  estado: NewsEstado;
  cuerpo: string;
  imagenPortada: string | null;
  fechaPublicacion: string;
  ultimaModificacion: string;
};

export type NewsInput = Omit<News, 'id' | 'ultimaModificacion'>;

export const CATEGORIA_OPTIONS: { value: NewsCategoria; label: string }[] = [
  { value: 'NOVEDAD', label: 'Novedad' },
  { value: 'EVENTO', label: 'Evento' },
  { value: 'CIRCULAR', label: 'Circular' },
  { value: 'PRODUCTO', label: 'Producto' },
  { value: 'COMUNICADO', label: 'Comunicado' },
];

export const AUDIENCIA_LABEL: Record<NewsAudiencia, string> = {
  PRODUCTORES: 'Productores',
  PUBLICO: 'Público',
};

export const ESTADO_LABEL: Record<NewsEstado, string> = {
  BORRADOR: 'Borrador',
  PUBLICADO: 'Publicado',
  DESPUBLICADA: 'Despublicada',
};

export const CATEGORIA_LABEL: Record<NewsCategoria, string> = {
  NOVEDAD: 'Novedad',
  EVENTO: 'Evento',
  CIRCULAR: 'Circular',
  PRODUCTO: 'Producto',
  COMUNICADO: 'Comunicado',
};
