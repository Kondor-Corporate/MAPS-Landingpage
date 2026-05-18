import { useEffect, useState } from 'react';
import { useNews } from '../hooks/useNews';

/**
 * Página de gestión de noticias para administradores
 */
export function NewsManagementPage() {
  const { noticias, loading, error, loadNoticias, deleteNews, publishNews, unpublishNews, currentPage, totalPages } = useNews();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadNoticias(1);
  }, [loadNoticias]);

  const handlePublish = async (id: number) => {
    if (confirm('¿Publicar esta noticia?')) {
      const success = await publishNews(id);
      if (success) {
        console.log('Noticia publicada');
      }
    }
  };

  const handleUnpublish = async (id: number) => {
    if (confirm('¿Despublicar esta noticia?')) {
      const success = await unpublishNews(id);
      if (success) {
        console.log('Noticia despublicada');
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Eliminar esta noticia? Esta acción no se puede deshacer.')) {
      const success = await deleteNews(id);
      if (success) {
        console.log('Noticia eliminada');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-maps-heading">Gestión de Noticias</h1>
          <p className="mt-1 text-sm text-maps-body">Crea, edita y publica noticias</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-maps-brand px-6 py-2 font-semibold text-white transition hover:bg-maps-brand-hover focus:outline-none focus:ring-2 focus:ring-maps-brand focus:ring-offset-2"
        >
          {showForm ? 'Cancelar' : 'Nueva Noticia'}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Form placeholder */}
      {showForm && (
        <div className="rounded-lg border border-maps-border bg-white p-6">
          <p className="text-maps-body">Formulario de noticia - implementar componente NewsForm</p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <p className="text-maps-body">Cargando noticias...</p>
        </div>
      )}

      {/* Table */}
      {!loading && noticias.length === 0 ? (
        <div className="rounded-lg border border-maps-border bg-white p-12 text-center">
          <p className="text-maps-muted">No hay noticias aún</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-maps-border bg-white">
          <table className="w-full">
            <thead className="border-b border-maps-border bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-maps-heading">Título</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-maps-heading">Estado</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-maps-heading">Visibilidad</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-maps-heading">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {noticias.map((noticia) => (
                <tr key={noticia.id} className="border-b border-maps-border hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-maps-heading">{noticia.titulo}</p>
                      <p className="text-sm text-maps-muted">{noticia.slug}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                        noticia.publicada
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {noticia.publicada ? 'Publicada' : 'Borrador'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-maps-body capitalize">{noticia.visibilidad}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() =>
                          noticia.publicada
                            ? handleUnpublish(noticia.id)
                            : handlePublish(noticia.id)
                        }
                        className="rounded px-3 py-1 text-sm transition hover:bg-gray-100"
                      >
                        {noticia.publicada ? 'Despublicar' : 'Publicar'}
                      </button>
                      <button
                        onClick={() => {
                          /* Edit */
                        }}
                        className="rounded px-3 py-1 text-sm text-maps-brand transition hover:bg-gray-100"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(noticia.id)}
                        className="rounded px-3 py-1 text-sm text-red-600 transition hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 border-t border-maps-border px-6 py-4">
              <button
                disabled={currentPage === 1}
                onClick={() => loadNoticias(currentPage - 1)}
                className="rounded px-3 py-1 disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-maps-body">
                Página {currentPage} de {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => loadNoticias(currentPage + 1)}
                className="rounded px-3 py-1 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
