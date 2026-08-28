import type { VoicePreview } from "@/lib/voices-api";

function sniffAudioMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return "audio/mpeg";
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return "audio/mpeg";
  }
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    return "audio/mp4";
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x4f &&
    bytes[1] === 0x67 &&
    bytes[2] === 0x67 &&
    bytes[3] === 0x53
  ) {
    return "audio/ogg";
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46
  ) {
    return "audio/wav";
  }
  return null;
}

function normalizeAudioContentType(contentType: string): string {
  const base = contentType.split(";")[0]?.trim().toLowerCase() || "audio/mpeg";
  if (base === "application/octet-stream") {
    return "audio/mpeg";
  }
  return base;
}

function decodeBase64Audio(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export type VoicePreviewPlayback = {
  audio: HTMLAudioElement;
  cleanup: () => void;
};

export function playVoicePreviewFromUrl(url: string): VoicePreviewPlayback {
  const audio = new Audio(url);
  audio.preload = "auto";
  return {
    audio,
    cleanup: () => {},
  };
}

export function playVoicePreviewFromApi(preview: VoicePreview): VoicePreviewPlayback {
  const bytes = decodeBase64Audio(preview.audioBase64);
  const type =
    sniffAudioMime(bytes) ?? normalizeAudioContentType(preview.contentType);
  const blob = new Blob([bytes.slice()], { type });
  const objectUrl = URL.createObjectURL(blob);
  const audio = new Audio(objectUrl);
  audio.preload = "auto";
  return {
    audio,
    cleanup: () => URL.revokeObjectURL(objectUrl),
  };
}
