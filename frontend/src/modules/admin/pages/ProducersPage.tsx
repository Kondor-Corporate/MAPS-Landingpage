import { useEffect, useState } from 'react';
import { useProducers } from '../hooks/useProducers';

/**
 * Página de gestión de productores para administradores
 */
export function ProducersPage() {
  const {
    productores,
    loading,
    error,
    loadProductores,
    deleteProducer,
    currentPage,
    totalPages,
  } = useProducers();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadProductores(1);
  }, [loadProductores]);

  const handleDelete = async (id: number) => {
    if (confirm('¿Eliminar este productor? Esta acción no se puede deshacer.')) {
      const success = await deleteProducer(id);
      if (success) {
        console.log('Productor eliminado');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-maps-heading">Gestión de Productores</h1>
          <p className="mt-1 text-sm text-maps-body">Crea y administra los productores de MAPS</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-maps-brand px-6 py-2 font-semibold text-white transition hover:bg-maps-brand-hover focus:outline-none focus:ring-2 focus:ring-maps-brand focus:ring-offset-2"
        >
          {showForm ? 'Cancelar' : 'Nuevo Productor'}
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
          <p className="text-maps-body">Formulario de productor - implementar componente ProducerForm</p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <p className="text-maps-body">Cargando productores...</p>
        </div>
      )}

      {/* Table */}
      {!loading && productores.length === 0 ? (
        <div className="rounded-lg border border-maps-border bg-white p-12 text-center">
          <p className="text-maps-muted">No hay productores aún</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-maps-border bg-white">
          <table className="w-full">
            <thead className="border-b border-maps-border bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-maps-heading">Nombre</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-maps-heading">Ciudad</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-maps-heading">Teléfono</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-maps-heading">Redes Sociales</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-maps-heading">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productores.map((productor) => (
                <tr key={productor.id} className="border-b border-maps-border hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-maps-heading">
                        {productor.nombre} {productor.apellido}
                      </p>
                      <p className="text-sm text-maps-muted">{productor.slug}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-maps-body">{productor.ciudad || '-'}</td>
                  <td className="px-6 py-4 text-sm text-maps-body">{productor.telefono || '-'}</td>
                  <td className="px-6 py-4 text-sm text-maps-body">
                    {productor.redesSociales.length} red(es)
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          /* Edit */
                        }}
                        className="rounded px-3 py-1 text-sm text-maps-brand transition hover:bg-gray-100"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(productor.id)}
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
                onClick={() => loadProductores(currentPage - 1)}
                className="rounded px-3 py-1 disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-sm text-maps-body">
                Página {currentPage} de {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => loadProductores(currentPage + 1)}
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
