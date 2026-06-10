// Maps a failed API load into the alert title/body shown to the student,
// with network-specific wording where the error shape allows it.
export function describeLoadError(error: unknown): { title: string; message: string } {
  let title = 'Connection Error';
  let message = 'Failed to load study data. Please try again.';

  if (error && typeof error === 'object' && 'code' in error) {
    switch (error.code) {
      case 'ECONNABORTED':
        title = 'Request Timeout';
        message = 'The server is taking too long to respond. Please check if the API server is running and try again.';
        break;
      case 'ECONNREFUSED':
        title = 'Connection Refused';
        message = 'Cannot reach the server. Please check your internet connection and try again.';
        break;
      case 'ENOTFOUND':
        title = 'Server Not Found';
        message = 'Cannot find the API server. Please check your network configuration.';
        break;
      default:
        message = `Network error (${error.code}): ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  } else if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as any;
    if (axiosError.response?.status) {
      title = 'Server Error';
      message = `Server returned error ${axiosError.response.status}. Please try again later.`;
    }
  } else {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    message = `Failed to load study data.\n\nError: ${errorMessage}`;
  }

  return { title, message };
}
