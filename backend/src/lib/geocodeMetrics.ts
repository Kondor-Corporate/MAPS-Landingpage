type GeocodeEvent =
  | 'geocode.cache_hit'
  | 'geocode.cache_miss'
  | 'geocode.provider_error'
  | 'geocode.rate_limited';

type GeocodeEventFields = Record<string, string | number | boolean | undefined>;

/**
 * Evento estructurado para observabilidad. El proyecto no tiene una librería
 * de logging: se usa `console` con JSON para poder filtrar/parsear en Cloud
 * Logging. Nunca incluir IPs completas ni datos personales (ver Fase 0 del
 * TDD MAPS-020).
 */
export function logGeocodeEvent(event: GeocodeEvent, fields: GeocodeEventFields = {}): void {
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...fields }));
}
