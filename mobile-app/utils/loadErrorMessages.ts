// Shared, student-facing recovery copy for popup and inline load errors.
export function describeLoadError(error: unknown): { title: string; message: string } {
  if (error && typeof error === 'object' && 'code' in error) {
    switch (error.code) {
      case 'ECONNABORTED':
      case 'ETIMEDOUT':
        return { title: 'This is taking too long', message: 'Please try again in a moment.' };
      case 'ECONNREFUSED':
      case 'ENOTFOUND':
      case 'ERR_NETWORK':
        return { title: 'Couldn’t connect', message: 'Check your connection and try again.' };
    }
  }
  return { title: 'Couldn’t load study data', message: 'Please try again in a moment.' };
}
