"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  Mic,
  Square,
  Store,
  Trash2,
  Upload,
} from "lucide-react";

import { useBusinessSession } from "@/components/businesses/business-session";
import { useOrganizationSession } from "@/components/organizations/organization-session";
import {
  hashVoiceCloneConsentText,
  VOICE_CLONE_CONSENT_TEXT,
  VOICE_CLONE_CONSENT_VERSION,
} from "@/components/voice-clones/voice-clone-consent";
import {
  formatSampleDuration,
  readAudioDurationSeconds,
} from "@/components/voice-clones/voice-clone-audio";
import { EmptyState } from "@/components/patterns/empty-state";
import { FormField } from "@/components/patterns/form-field";
import { LoadingState } from "@/components/patterns/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEffectTask } from "@/hooks/use-effect-task";
import {
  canCreateVoiceClone,
  formatSampleBytes,
  VOICE_CLONE_MAX_SAMPLE_BYTES,
  VOICE_CLONE_MAX_SAMPLES,
  VOICE_CLONE_MIN_TOTAL_SECONDS,
  voiceClonesApi,
  type VoiceCloneDetail,
  type VoiceCloneSample,
} from "@/lib/voice-clones-api";
import { cn } from "@/lib/utils";

type WizardStep = 1 | 2 | 3;

const ACCEPTED_AUDIO =
  "audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/webm,audio/ogg,.mp3,.wav,.m4a,.webm";

export default function CreateVoiceClonePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("resume") ?? undefined;
  const { active: org } = useOrganizationSession();
  const { active: business, status: bizStatus } = useBusinessSession();
  const canCreate = canCreateVoiceClone(org?.role);

  const [step, setStep] = React.useState<WizardStep>(1);
  const [displayName, setDisplayName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [consentChecked, setConsentChecked] = React.useState(false);
  const [clone, setClone] = React.useState<VoiceCloneDetail | null>(null);
  const [samples, setSamples] = React.useState<VoiceCloneSample[]>([]);
  const [sampleDurations, setSampleDurations] = React.useState<
    Record<string, number>
  >({});
  const [submitting, setSubmitting] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [resuming, setResuming] = React.useState(Boolean(resumeId));

  const [recording, setRecording] = React.useState(false);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<BlobPart[]>([]);

  const loadResume = React.useCallback(async () => {
    if (!resumeId) {
      setResuming(false);
      return;
    }
    setResuming(true);
    setError(null);
    const result = await voiceClonesApi.get(resumeId);
    setResuming(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    const next = result.data.clone;
    if (next.status !== "draft") {
      router.replace(`/voices/clones/${next.id}`);
      return;
    }
    setClone(next);
    setDisplayName(next.displayName);
    setDescription(next.description ?? "");
    setSamples(next.samples);
    setConsentChecked(next.consentRecorded);
    setStep(next.consentRecorded ? 2 : 1);
  }, [resumeId, router]);

  useEffectTask(loadResume, [loadResume]);

  const totalSampleSeconds = React.useMemo(
    () =>
      Object.values(sampleDurations).reduce(
        (sum, value) => sum + (Number.isFinite(value) ? value : 0),
        0,
      ),
    [sampleDurations],
  );

  React.useEffect(() => {
    return () => {
      recorderRef.current?.stop();
    };
  }, []);

  if (bizStatus === "loading" || resuming) {
    return <LoadingState label="Loading business…" />;
  }

  if (!business || business.status === "archived") {
    return (
      <EmptyState
        icon={Store}
        title="Select an active business"
        description="Choose an active business before creating a custom voice."
        action={
          <Button asChild>
            <Link href="/businesses">Go to businesses</Link>
          </Button>
        }
      />
    );
  }

  if (!canCreate) {
    return (
      <EmptyState
        icon={Store}
        title="Permission required"
        description="Only owners, admins, and managers can create custom voice clones."
        action={
          <Button asChild variant="outline">
            <Link href="/voices/clones">Back to clones</Link>
          </Button>
        }
      />
    );
  }

  const sampleDurationMessage = (): string | null => {
    if (samples.length === 0) return null;
    if (Object.keys(sampleDurations).length < samples.length) {
      return `Uploaded ${samples.length} sample(s). ElevenLabs needs about ${formatSampleDuration(VOICE_CLONE_MIN_TOTAL_SECONDS)} of clear speech total — add more audio before submitting.`;
    }
    if (totalSampleSeconds < VOICE_CLONE_MIN_TOTAL_SECONDS) {
      return `Total speech is ${formatSampleDuration(totalSampleSeconds)}. Upload at least ${formatSampleDuration(VOICE_CLONE_MIN_TOTAL_SECONDS)} of clear audio (MP3 recommended).`;
    }
    return `Total speech: ${formatSampleDuration(totalSampleSeconds)} — ready to submit.`;
  };

  const ensureDraft = async (): Promise<VoiceCloneDetail | null> => {
    if (clone) return clone;
    if (!displayName.trim()) {
      setError("Display name is required.");
      return null;
    }
    const result = await voiceClonesApi.create({
      displayName: displayName.trim(),
      description: description.trim() || null,
    });
    if (!result.ok) {
      setError(result.message);
      return null;
    }
    setClone(result.data.clone);
    setSamples(result.data.clone.samples);
    return result.data.clone;
  };

  const onStep1Next = async () => {
    if (!consentChecked) {
      setError("You must accept the consent statement to continue.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const draft = await ensureDraft();
    if (!draft) {
      setSubmitting(false);
      return;
    }
    const hash = await hashVoiceCloneConsentText();
    const consentResult = await voiceClonesApi.recordConsent(draft.id, {
      consentVersion: VOICE_CLONE_CONSENT_VERSION,
      consentTextHash: hash,
    });
    setSubmitting(false);
    if (!consentResult.ok) {
      setError(consentResult.message);
      return;
    }
    setStep(2);
  };

  const uploadFile = async (file: File) => {
    if (!clone) {
      const draft = await ensureDraft();
      if (!draft) return;
    }
    const activeClone = clone ?? (await ensureDraft());
    if (!activeClone) return;

    if (samples.length >= VOICE_CLONE_MAX_SAMPLES) {
      setError(`You can upload up to ${VOICE_CLONE_MAX_SAMPLES} samples.`);
      return;
    }
    if (file.size > VOICE_CLONE_MAX_SAMPLE_BYTES) {
      setError(
        `Each sample must be under ${formatSampleBytes(VOICE_CLONE_MAX_SAMPLE_BYTES)}.`,
      );
      return;
    }

    setUploading(true);
    setError(null);
    const duration = await readAudioDurationSeconds(file);
    const result = await voiceClonesApi.uploadSample(activeClone.id, file);
    setUploading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSamples((prev) => [...prev, result.data.sample]);
    if (duration != null) {
      setSampleDurations((prev) => ({
        ...prev,
        [result.data.sample.id]: duration,
      }));
    }
  };

  const onFilesSelected = (files: FileList | null) => {
    if (!files?.length) return;
    void (async () => {
      for (const file of Array.from(files)) {
        await uploadFile(file);
      }
    })();
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    onFilesSelected(event.dataTransfer.files);
  };

  const removeSample = async (sampleId: string) => {
    if (!clone) return;
    setUploading(true);
    setError(null);
    const result = await voiceClonesApi.deleteSample(clone.id, sampleId);
    setUploading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSamples((prev) => prev.filter((s) => s.id !== sampleId));
    setSampleDurations((prev) => {
      const next = { ...prev };
      delete next[sampleId];
      return next;
    });
  };

  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Recording is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        if (blob.size < 1024) {
          setError("Recording was too short. Record at least 30 seconds, ideally 1–2 minutes total.");
          return;
        }
        const file = new File([blob], `recording-${Date.now()}.webm`, {
          type: blob.type || "audio/webm",
        });
        await uploadFile(file);
      };
      recorderRef.current = recorder;
      recorder.start(250);
      setRecording(true);
      setError(null);
    } catch {
      setError("Microphone access was denied or unavailable.");
    }
  };

  const pollUntilReady = async (cloneId: string) => {
    const started = Date.now();
    const maxMs = 120_000;
    while (Date.now() - started < maxMs) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const statusResult = await voiceClonesApi.status(cloneId);
      if (!statusResult.ok) continue;
      if (statusResult.data.status === "ready") {
        router.push(`/voices/clones/${cloneId}`);
        return;
      }
      if (statusResult.data.status === "failed") {
        router.push(`/voices/clones/${cloneId}`);
        return;
      }
    }
    router.push(`/voices/clones/${cloneId}`);
  };

  const onSubmit = async () => {
    if (!clone) {
      setError("Complete the earlier steps first.");
      return;
    }
    if (samples.length === 0) {
      setError("Upload at least one audio sample before submitting.");
      return;
    }
    if (
      Object.keys(sampleDurations).length >= samples.length &&
      totalSampleSeconds < VOICE_CLONE_MIN_TOTAL_SECONDS
    ) {
      setError(
        `ElevenLabs needs about ${formatSampleDuration(VOICE_CLONE_MIN_TOTAL_SECONDS)} of clear speech. You have ${formatSampleDuration(totalSampleSeconds)} so far.`,
      );
      return;
    }
    setProcessing(true);
    setError(null);
    const result = await voiceClonesApi.submit(clone.id);
    if (!result.ok) {
      setProcessing(false);
      setError(result.message);
      return;
    }
    void pollUntilReady(clone.id);
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Create custom voice
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Step {step} of 3 — consent, samples, then submit for {business.name}.
        </p>
      </div>

      <ol className="flex gap-2 text-xs text-muted-foreground" aria-label="Wizard progress">
        {[1, 2, 3].map((n) => (
          <li
            key={n}
            className={cn(
              "rounded-full px-2.5 py-0.5",
              step === n && "bg-muted font-medium text-foreground",
            )}
          >
            {n === 1 ? "Consent" : n === 2 ? "Samples" : "Review"}
          </li>
        ))}
      </ol>

      <div className="space-y-4 rounded-xl border bg-card p-6">
        {step === 1 ? (
          <>
            <FormField label="Display name" htmlFor="clone-name" required>
              <Input
                id="clone-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Owner custom voice"
                disabled={submitting}
              />
            </FormField>
            <FormField label="Description" htmlFor="clone-description">
              <Textarea
                id="clone-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                disabled={submitting}
                placeholder="Optional note for your team"
              />
            </FormField>
            <div className="space-y-3 rounded-lg border border-border/70 bg-muted/30 p-4">
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {VOICE_CLONE_CONSENT_TEXT}
              </p>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={consentChecked}
                  disabled={submitting}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                />
                <span>
                  I confirm I have rights to clone this voice and accept the
                  terms above (version {VOICE_CLONE_CONSENT_VERSION}).
                </span>
              </label>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <p className="text-sm text-muted-foreground">
              Upload up to {VOICE_CLONE_MAX_SAMPLES} files ({formatSampleBytes(VOICE_CLONE_MAX_SAMPLE_BYTES)} each).
              ElevenLabs needs about {formatSampleDuration(VOICE_CLONE_MIN_TOTAL_SECONDS)} of clear speech total — MP3 is recommended.
            </p>
            <p className="rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Requires private object storage on the server (
              <code className="text-foreground">OBJECT_STORAGE_ENABLED=true</code>
              ) and an ElevenLabs API key on a plan that includes{" "}
              <strong>Instant Voice Cloning</strong> (free tier does not).
            </p>
            <div
              className={cn(
                "rounded-lg border border-dashed p-8 text-center transition-colors",
                dragActive ? "border-info bg-info/5" : "border-border",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
            >
              <Upload className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
              <p className="mt-2 text-sm font-medium">Drag and drop audio files</p>
              <p className="mt-1 text-xs text-muted-foreground">or choose from your device</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Input
                  id="clone-samples"
                  type="file"
                  accept={ACCEPTED_AUDIO}
                  disabled={uploading || recording}
                  multiple
                  onChange={(e) => onFilesSelected(e.target.files)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => void toggleRecording()}
                >
                  {recording ? (
                    <>
                      <Square className="size-4" aria-hidden="true" />
                      Stop recording
                    </>
                  ) : (
                    <>
                      <Mic className="size-4" aria-hidden="true" />
                      Record sample
                    </>
                  )}
                </Button>
              </div>
              {uploading ? (
                <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                  Uploading…
                </p>
              ) : null}
            </div>
            {samples.length > 0 ? (
              <ul className="space-y-2">
                {samples.map((sample) => (
                  <li
                    key={sample.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <span className="truncate">{sample.originalFilename}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {formatSampleBytes(sample.byteSize)}
                      {sampleDurations[sample.id] != null
                        ? ` · ${formatSampleDuration(sampleDurations[sample.id])}`
                        : ""}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={uploading}
                      aria-label={`Remove ${sample.originalFilename}`}
                      onClick={() => void removeSample(sample.id)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
            {samples.length > 0 && sampleDurationMessage() ? (
              <p
                className={cn(
                  "text-sm",
                  totalSampleSeconds >= VOICE_CLONE_MIN_TOTAL_SECONDS
                    ? "text-success-strong"
                    : "text-warning-strong",
                )}
              >
                {sampleDurationMessage()}
              </p>
            ) : null}
          </>
        ) : null}

        {step === 3 ? (
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{displayName.trim() || clone?.displayName}</dd>
            </div>
            {description.trim() || clone?.description ? (
              <div>
                <dt className="text-muted-foreground">Description</dt>
                <dd>{description.trim() || clone?.description}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-muted-foreground">Samples</dt>
              <dd>{samples.length}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Consent</dt>
              <dd>Recorded ({VOICE_CLONE_CONSENT_VERSION})</dd>
            </div>
            {processing ? (
              <p className="inline-flex items-center gap-2 text-info-strong">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Submitting to voice provider… This may take up to two minutes.
              </p>
            ) : null}
          </dl>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive-strong" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-between gap-2 pt-2">
          <Button asChild variant="outline" disabled={submitting || processing}>
            <Link href="/voices/clones">Cancel</Link>
          </Button>
          <div className="flex flex-wrap gap-2">
            {step > 1 && !processing ? (
              <Button
                type="button"
                variant="outline"
                disabled={submitting || uploading}
                onClick={() => setStep((s) => (s > 1 ? ((s - 1) as WizardStep) : s))}
              >
                Back
              </Button>
            ) : null}
            {step === 1 ? (
              <Button
                type="button"
                disabled={submitting}
                onClick={() => void onStep1Next()}
              >
                {submitting ? "Saving…" : "Continue to samples"}
              </Button>
            ) : null}
            {step === 2 ? (
              <Button
                type="button"
                disabled={
                  uploading ||
                  samples.length === 0 ||
                  (Object.keys(sampleDurations).length >= samples.length &&
                    totalSampleSeconds < VOICE_CLONE_MIN_TOTAL_SECONDS)
                }
                onClick={() => setStep(3)}
              >
                Review & submit
              </Button>
            ) : null}
            {step === 3 && !processing ? (
              <Button type="button" onClick={() => void onSubmit()}>
                Submit clone
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
