export function RouteFallback() {
  return (
    <div className="min-h-[50vh]" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando...</span>
    </div>
  );
}
