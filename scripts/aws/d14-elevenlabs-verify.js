const apiKey = (process.env.ELEVENLABS_API_KEY || '').trim();
const baseUrl = (
  process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io'
).replace(/\/$/, '');
const externalAgentId = (process.env.D14_ELEVENLABS_AGENT_ID || '').trim();
const expectedWebhookUrl = (process.env.D14_ELEVENLABS_WEBHOOK_URL || '').trim();

async function apiFetch(path, options = {}, attempt = 1) {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'xi-api-key': apiKey,
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });
    return response;
  } catch (error) {
    if (attempt >= 3) throw error;
    await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    return apiFetch(path, options, attempt + 1);
  }
}

(async () => {
  if (!apiKey) {
    console.error('D14 elevenlabs BLOCKED: API key missing from environment');
    process.exit(2);
  }

  const userResponse = await apiFetch('/v1/user');
  if (!userResponse.ok) {
    console.error(
      `D14 elevenlabs BLOCKED: API key validation failed (${userResponse.status})`,
    );
    process.exit(3);
  }
  const user = await userResponse.json();
  console.log(`D14 elevenlabs_api_valid=yes`);
  console.log(`D14 elevenlabs_subscription=${user.subscription?.tier || 'unknown'}`);

  if (externalAgentId) {
    const agentResponse = await apiFetch(
      `/v1/convai/agents/${encodeURIComponent(externalAgentId)}`,
    );
    if (!agentResponse.ok) {
      console.error(
        `D14 elevenlabs BLOCKED: configured agent not accessible (${agentResponse.status})`,
      );
      process.exit(4);
    }
    const agent = await agentResponse.json();
    console.log(`D14 elevenlabs_agent_id=${agent.agent_id || externalAgentId}`);
    console.log(`D14 elevenlabs_agent_name=${agent.name || 'unknown'}`);
  }

  let webhookVerified = false;
  let transcriptEnabled = false;
  const webhookListResponse = await apiFetch(
    '/v1/workspace/webhooks?include_usages=true',
  );
  if (webhookListResponse.ok) {
    const payload = await webhookListResponse.json();
    const webhooks = Array.isArray(payload)
      ? payload
      : payload.webhooks || payload.items || [];
    for (const hook of webhooks) {
      const url = hook.webhook_url || hook.url || hook.callback_url || '';
      const name = hook.name || hook.display_name || '';
      if (expectedWebhookUrl && url === expectedWebhookUrl) {
        webhookVerified = true;
        console.log(`D14 elevenlabs_webhook_name=${name || 'matched'}`);
        console.log(`D14 elevenlabs_webhook_url=${url}`);
        console.log(
          `D14 elevenlabs_webhook_auth=${hook.auth_type || hook.authentication || 'unknown'}`,
        );
        const events = hook.events || [];
        transcriptEnabled = events.includes('transcript');
        console.log(`D14 elevenlabs_webhook_events=${events.join(',') || 'none'}`);
      }
    }
    console.log(`D14 elevenlabs_webhook_api_list_count=${webhooks.length}`);
  } else {
    console.log(
      `D14 elevenlabs_webhook_api_unavailable=${webhookListResponse.status}`,
    );
  }

  const settingsResponse = await apiFetch('/v1/convai/settings');
  if (settingsResponse.ok) {
    const settings = await settingsResponse.json();
    const postCallId =
      settings.webhooks?.post_call_webhook_id ||
      settings.webhooks?.postCallWebhookId ||
      '';
    const events = settings.webhooks?.events || [];
    console.log(`D14 elevenlabs_convai_post_call_webhook_id=${postCallId || 'none'}`);
    console.log(`D14 elevenlabs_convai_events=${events.join(',') || 'none'}`);
    if (events.includes('transcript')) {
      transcriptEnabled = true;
    }
  } else {
    console.log(
      `D14 elevenlabs_convai_settings_unavailable=${settingsResponse.status}`,
    );
  }

  if (expectedWebhookUrl && webhookVerified) {
    console.log('D14 elevenlabs_webhook_api_verified=yes');
  } else if (expectedWebhookUrl) {
    console.log('D14 elevenlabs_webhook_api_verified=no');
    console.log('D14 elevenlabs_webhook_manual_verification_required=yes');
  }
  console.log(`D14 elevenlabs_transcript_event=${transcriptEnabled ? 'yes' : 'no'}`);

  console.log('D14 elevenlabs_connectivity=PASS');
})().catch((error) => {
  console.error(
    `D14 elevenlabs verify failed: ${error.message || 'unknown error'}`,
  );
  process.exit(1);
});
