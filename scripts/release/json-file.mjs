/**
 * Lectura de JSON generado por herramientas del operador.
 *
 * En Windows PowerShell 5.1, `comando > archivo.json` escribe UTF-16 con BOM y
 * `| Out-File -Encoding utf8` escribe UTF-8 con BOM. `JSON.parse` rechaza ambos. Este lector
 * los acepta para que la ayuda local del operador no dependa de cómo redirigió la salida.
 * Solo para archivos locales del operador: el workflow (Linux) escribe UTF-8 sin BOM.
 */

import { readFileSync } from 'node:fs';

/**
 * @param {Buffer} buffer
 * @param {string} [label]
 */
export function decodeJsonBytes(buffer, label = 'archivo') {
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString('utf16le');
  }
  if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    throw new Error(`${label}: UTF-16 big-endian no soportado; regenerarlo en UTF-8.`);
  }
  const text = buffer.toString('utf8');
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** @param {string} path */
export function readJsonFile(path) {
  return JSON.parse(decodeJsonBytes(readFileSync(path), path));
}
