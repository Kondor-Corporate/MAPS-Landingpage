import axios from 'axios';

export function getApiErrorMessage(error: unknown, fallback = 'Ocurrió un error'): string {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message;
    if (typeof msg === 'string' && msg.trim() !== '') return msg;
  }
  return fallback;
}
