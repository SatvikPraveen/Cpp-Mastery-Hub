import axios from 'axios';

/**
 * Narrow an unknown thrown value to a human-readable message.
 * Prefers the API's `message` field for axios errors, then `Error.message`.
 */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const data: unknown = error.response?.data;
    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as { message?: unknown }).message;
      if (typeof message === 'string' && message.length > 0) return message;
    }
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === 'string' && error.length > 0) return error;
  return fallback;
}

/** HTTP status of an axios error, if any. */
export function getErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}
