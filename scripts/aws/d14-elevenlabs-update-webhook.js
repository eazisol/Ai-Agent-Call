const apiKey = (process.env.ELEVENLABS_API_KEY || '').trim();
const baseUrl = (
  process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io'
).replace(/\/$/, '');
const expectedWebhookUrl = (process.env.D14_ELEVENLABS_WEBHOOK_URL || '').trim();

async function apiFetch(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'xi-api-key': apiKey,
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });
}

(async () => {
  if (!apiKey || !expectedWebhookUrl) {
    console.error('D14 elevenlabs update BLOCKED: missing API key or target URL');
    process.exit(2);
  }

  const listResponse = await apiFetch('/v1/workspace/webhooks?include_usages=true');
  if (!listResponse.ok) {
    console.error(`D14 elevenlabs update BLOCKED: list failed (${listResponse.status})`);
    process.exit(3);
  }
  const payload = await listResponse.json();
  const webhooks = Array.isArray(payload)
    ? payload
    : payload.webhooks || payload.items || [];

  let target = webhooks.find((hook) => {
    const url = hook.webhook_url || hook.url || hook.callback_url || '';
    return url.includes('cloudfront.net') || url.includes('eazi-ai-call.vercel.app');
  });
  if (!target) {
    target = webhooks.find((hook) =>
      String(hook.name || hook.display_name || '')
        .toLowerCase()
        .includes('eazi'),
    );
  }
  if (!target) {
    console.error('D14 elevenlabs update BLOCKED: no matching webhook found');
    console.log(`D14 elevenlabs_webhook_api_list_count=${webhooks.length}`);
    process.exit(4);
  }

  const id = target.webhook_id || target.id;
  const currentUrl = target.webhook_url || target.url || target.callback_url || '';
  console.log(`D14 elevenlabs_webhook_id=${id}`);
  console.log(`D14 elevenlabs_webhook_url_before=${currentUrl}`);

  if (currentUrl === expectedWebhookUrl) {
    console.log('D14 elevenlabs_updated=no');
    console.log('D14 elevenlabs_update=PASS');
    process.exit(0);
  }

  const updateResponse = await apiFetch(
    `/v1/workspace/webhooks/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: target.name || target.display_name || 'EaziAICall Production Post-Call',
        is_disabled: Boolean(target.is_disabled ?? false),
        webhook_url: expectedWebhookUrl,
      }),
    },
  );
  if (!updateResponse.ok) {
    const text = await updateResponse.text();
    console.error(
      `D14 elevenlabs update BLOCKED: patch failed (${updateResponse.status}) ${text.slice(0, 200)}`,
    );
    process.exit(5);
  }

  const updated = await updateResponse.json().catch(() => ({}));
  const after =
    updated.webhook_url ||
    updated.url ||
    updated.callback_url ||
    expectedWebhookUrl;
  console.log(`D14 elevenlabs_webhook_url_after=${after}`);
  console.log('D14 elevenlabs_updated=yes');
  console.log('D14 elevenlabs_update=PASS');
})().catch((error) => {
  console.error(`D14 elevenlabs update failed: ${error.message || 'unknown'}`);
  process.exit(1);
});