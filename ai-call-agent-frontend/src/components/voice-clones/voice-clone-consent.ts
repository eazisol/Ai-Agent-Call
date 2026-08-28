import { VOICE_CLONE_CONSENT_VERSION } from "@/lib/voice-clones-api";

/**
 * Canonical consent copy for version m09-v1.
 * The SHA-256 hash of this exact string is sent to the API as evidence.
 */
export const VOICE_CLONE_CONSENT_TEXT = `Voice cloning consent (m09-v1)

By proceeding, I confirm that:

• I have the legal right and explicit permission to clone the voice represented in the samples I upload.
• The samples are recordings of a person who has consented to this use, or I am that person.
• This custom voice will be owned by my business in EaziAiCall and may be assigned to multiple AI agents.
• I understand samples are stored privately and used only to create the clone with our voice provider.
• I may revoke this clone later; agents must be unassigned before permanent deletion.`;

export { VOICE_CLONE_CONSENT_VERSION };

export async function hashVoiceCloneConsentText(
  text: string = VOICE_CLONE_CONSENT_TEXT,
): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
