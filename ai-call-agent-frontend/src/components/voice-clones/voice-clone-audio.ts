export async function readAudioDurationSeconds(
  file: File,
): Promise<number | null> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        resolve(Number.isFinite(audio.duration) ? audio.duration : null);
      };
      audio.onerror = () => resolve(null);
      audio.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function formatSampleDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}
