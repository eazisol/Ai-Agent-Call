/**
 * Provider-neutral knowledge / RAG sync port (M07).
 * Distinct from VoiceAgentSyncPort (M06 agent provisioning).
 */

export type KnowledgeSyncProviderName = 'elevenlabs' | string;

export type KnowledgePublishInput = {
  name: string;
  type: 'file' | 'url' | 'text' | 'faq';
  url?: string | null;
  textBody?: string | null;
  /** FAQ items rendered by the adapter when type is faq. */
  faqItems?: Array<{ question: string; answer: string }> | null;
  /** Original file bytes when available for type file. */
  fileBytes?: Buffer | null;
  originalFilename?: string | null;
  contentType?: string | null;
};

export type KnowledgePublishResult = {
  externalSourceId: string;
  warnings: string[];
};

export type KnowledgeProviderStatus = {
  externalSourceId: string;
  exists: boolean;
  name?: string | null;
  rawStatus?: string | null;
};

export interface KnowledgeSyncPort {
  readonly providerName: KnowledgeSyncProviderName;
  isConfigured(): boolean;
  publish(input: KnowledgePublishInput): Promise<KnowledgePublishResult>;
  /**
   * Update an existing remote document. When the provider has no dedicated
   * update API, adapters may delete+recreate and return a new external id.
   */
  update(
    externalId: string,
    input: KnowledgePublishInput,
  ): Promise<KnowledgePublishResult>;
  /** Best-effort remove; may no-op if remote id is already gone. */
  remove(externalId: string): Promise<void>;
  getStatus(externalId: string): Promise<KnowledgeProviderStatus>;
}

export const KNOWLEDGE_SYNC_PORT = Symbol('KNOWLEDGE_SYNC_PORT');
