"use client";

import * as React from "react";
import { Loader2, Play, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { voicesApi } from "@/lib/voices-api";
import {
  playVoicePreviewFromApi,
  playVoicePreviewFromUrl,
  type VoicePreviewPlayback,
} from "@/components/voices/voice-preview-audio";

type Props = {
  voiceId: string;
  sampleText?: string | null;
  previewAudioUrl?: string | null;
  disabled?: boolean;
  size?: "sm" | "default";
};

export function VoicePreviewButton({
  voiceId,
  sampleText,
  previewAudioUrl,
  disabled,
  size = "sm",
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const playbackRef = React.useRef<VoicePreviewPlayback | null>(null);

  React.useEffect(() => {
    return () => {
      playbackRef.current?.audio.pause();
      playbackRef.current?.cleanup();
      playbackRef.current = null;
    };
  }, []);

  const stop = () => {
    playbackRef.current?.audio.pause();
    playbackRef.current?.cleanup();
    playbackRef.current = null;
    setPlaying(false);
  };

  const startPlayback = async (playback: VoicePreviewPlayback) => {
    stop();
    playbackRef.current = playback;
    playback.audio.onended = () => {
      stop();
    };
    playback.audio.onerror = () => {
      stop();
      setError("Could not play preview.");
    };
    setPlaying(true);
    await playback.audio.play();
  };

  const onPreview = async () => {
    if (playing) {
      stop();
      return;
    }
    setLoading(true);
    setError(null);

    if (previewAudioUrl) {
      try {
        await startPlayback(playVoicePreviewFromUrl(previewAudioUrl));
        setLoading(false);
        return;
      } catch {
        /* fall back to API preview */
      }
    }

    const result = await voicesApi.preview(voiceId, sampleText ?? undefined);
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    try {
      await startPlayback(playVoicePreviewFromApi(result.data.preview));
    } catch {
      setError("Could not play preview.");
    }
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={disabled || loading}
        onClick={() => void onPreview()}
        aria-label={playing ? "Stop preview" : "Preview voice"}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : playing ? (
          <Square className="size-4" aria-hidden="true" />
        ) : (
          <Play className="size-4" aria-hidden="true" />
        )}
        {playing ? "Stop" : "Preview"}
      </Button>
      {error ? (
        <span className="text-xs text-destructive-strong" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
