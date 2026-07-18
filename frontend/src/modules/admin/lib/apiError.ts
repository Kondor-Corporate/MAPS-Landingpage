import axios from 'axios';

const TECHNICAL_MESSAGE_PATTERN =
  /axios|request failed|status code|internal server error|stack trace|ECONN|ETIMEDOUT/i;

export function getApiErrorMessage(error: unknown, fallback = 'Ocurrió un error'): string {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message;
    if (
      typeof msg === 'string' &&
      msg.trim() !== '' &&
      !TECHNICAL_MESSAGE_PATTERN.test(msg)
    ) {
      return msg.trim();
    }
  }
  return fallback;
}
