/**
 * Versión vigente del texto de consentimiento de una postulación.
 * La decide el servidor al persistir. El cliente sólo puede enviar
 * `consentimiento: true` y no elige esta versión.
 * Incrementar cuando ese texto cambie de forma sustancial.
 */
export const POSTULACION_PRIVACY_VERSION = '1';
