import { useEffect } from 'react';
import { useLibrary } from '../hooks/useLibrary';

/**
 * Página de la Biblioteca Digital para intranet
 */
export function DigitalLibraryPage() {
  const { bibliotecas, loading, error, loadBibliotecas } = useLibrary();

  useEffect(() => {
    loadBibliotecas();
  }, [loadBibliotecas]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-maps-heading">Biblioteca Digital</h1>
        <p className="mt-1 text-sm text-maps-body">Accede a recursos educativos organizados por asignaturas</p>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <p className="text-maps-body">Cargando biblioteca...</p>
        </div>
      )}

      {/* Bibliotecas */}
      {!loading && bibliotecas.length === 0 ? (
        <div className="rounded-lg border border-maps-border bg-white p-12 text-center">
          <p className="text-maps-muted">No hay bibliotecas disponibles</p>
        </div>
      ) : (
        <div className="space-y-6">
          {bibliotecas.map((biblioteca) => (
            <div key={biblioteca.id} className="rounded-lg border border-maps-border bg-white overflow-hidden">
              {/* Biblioteca Header */}
              <div className="border-b border-maps-border bg-gray-50 px-6 py-4">
                <h2 className="text-xl font-semibold text-maps-heading">{biblioteca.nombre}</h2>
                {biblioteca.descripcion && (
                  <p className="mt-1 text-sm text-maps-body">{biblioteca.descripcion}</p>
                )}
              </div>

              {/* Ramos */}
              <div className="divide-y divide-maps-border">
                {biblioteca.ramos.length === 0 ? (
                  <div className="px-6 py-8 text-center text-maps-muted">
                    No hay ramos disponibles
                  </div>
                ) : (
                  biblioteca.ramos.map((ramo) => (
                    <div key={ramo.id} className="px-6 py-4">
                      <h3 className="font-medium text-maps-heading">{ramo.nombre}</h3>
                      {ramo.descripcion && (
                        <p className="mt-1 text-sm text-maps-body">{ramo.descripcion}</p>
                      )}

                      {/* Recursos */}
                      {ramo.recursos.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {ramo.recursos.map((recurso) => (
                            <a
                              key={recurso.id}
                              href={recurso.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block rounded bg-gray-50 px-4 py-2 text-sm text-maps-brand transition hover:bg-gray-100"
                            >
                              📄 Ver recurso
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
