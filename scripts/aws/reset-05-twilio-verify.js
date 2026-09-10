/**
 * RESET-05 — Verify repurchased Twilio number + reconcile webhooks (ops).
 * Does not print auth tokens.
 */
const twilio = require('twilio');

const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
const expectedE164 = (process.env.RESET05_E164 || '+18314809958').trim();
const expectedSid = (
  process.env.RESET05_PHONE_SID || 'PN80a9e2d52f491f05ff461b523359eec0'
).trim();
const oldSid = (
  process.env.RESET05_OLD_SID || 'PN955403bd40b0708ec33ab960a1b7886b'
).trim();
const incomingUrl = (
  process.env.RESET05_INCOMING_URL ||
  'https://eazi-ai-call.vercel.app/api/v1/webhooks/twilio/incoming-call'
).trim();
const statusUrl = (
  process.env.RESET05_STATUS_URL ||
  'https://eazi-ai-call.vercel.app/api/v1/webhooks/twilio/status-callback'
).trim();
const applyFix = (process.env.RESET05_APPLY_WEBHOOKS || 'YES') === 'YES';

(async () => {
  if (!accountSid || !authToken) {
    console.error('RESET05 twilio BLOCKED: credentials missing');
    process.exit(2);
  }

  console.log('RESET05 twilio_start=yes');
  console.log(`RESET05 expected_e164=${expectedE164}`);
  console.log(`RESET05 expected_sid=${expectedSid}`);
  console.log(`RESET05 old_sid=${oldSid}`);

  const client = twilio(accountSid, authToken);
  const account = await client.api.accounts(accountSid).fetch();
  console.log(`RESET05 twilio_account_status=${account.status}`);

  let number;
  try {
    number = await client.incomingPhoneNumbers(expectedSid).fetch();
  } catch (err) {
    console.error(
      `RESET05 twilio BLOCKED: NEW SID fetch failed (${err.message || 'unknown'})`,
    );
    process.exit(3);
  }

  console.log(`RESET05 live_sid=${number.sid}`);
  console.log(`RESET05 live_e164=${number.phoneNumber}`);
  console.log(`RESET05 live_status=${number.status || 'n/a'}`);
  console.log(`RESET05 live_voice_url=${number.voiceUrl || ''}`);
  console.log(`RESET05 live_voice_method=${number.voiceMethod || ''}`);
  console.log(`RESET05 live_status_callback=${number.statusCallback || ''}`);
  console.log(
    `RESET05 live_status_callback_method=${number.statusCallbackMethod || ''}`,
  );

  if (number.sid !== expectedSid) {
    console.error('RESET05 twilio BLOCKED: SID mismatch');
    process.exit(4);
  }
  if (number.phoneNumber !== expectedE164) {
    console.error('RESET05 twilio BLOCKED: E.164 mismatch');
    process.exit(5);
  }

  let oldExists = 'no';
  try {
    await client.incomingPhoneNumbers(oldSid).fetch();
    oldExists = 'yes';
  } catch {
    oldExists = 'no';
  }
  console.log(`RESET05 old_sid_exists=${oldExists}`);

  const needsUpdate =
    number.voiceUrl !== incomingUrl ||
    (number.voiceMethod || '').toUpperCase() !== 'POST' ||
    number.statusCallback !== statusUrl ||
    (number.statusCallbackMethod || '').toUpperCase() !== 'POST';

  console.log(`RESET05 webhooks_need_update=${needsUpdate ? 'yes' : 'no'}`);
  console.log(`RESET05 apply_webhooks=${applyFix ? 'yes' : 'no'}`);

  if (needsUpdate && applyFix) {
    await client.incomingPhoneNumbers(expectedSid).update({
      voiceUrl: incomingUrl,
      voiceMethod: 'POST',
      statusCallback: statusUrl,
      statusCallbackMethod: 'POST',
    });
    number = await client.incomingPhoneNumbers(expectedSid).fetch();
    console.log(`RESET05 after_voice_url=${number.voiceUrl || ''}`);
    console.log(`RESET05 after_voice_method=${number.voiceMethod || ''}`);
    console.log(`RESET05 after_status_callback=${number.statusCallback || ''}`);
    console.log(
      `RESET05 after_status_callback_method=${number.statusCallbackMethod || ''}`,
    );
  }

  if (number.voiceUrl !== incomingUrl) {
    console.error('RESET05 twilio BLOCKED: incoming Voice URL incorrect');
    process.exit(6);
  }
  if ((number.voiceMethod || '').toUpperCase() !== 'POST') {
    console.error('RESET05 twilio BLOCKED: voice method not POST');
    process.exit(7);
  }
  if (number.statusCallback !== statusUrl) {
    console.error('RESET05 twilio BLOCKED: status callback URL incorrect');
    process.exit(8);
  }
  if ((number.statusCallbackMethod || '').toUpperCase() !== 'POST') {
    console.error('RESET05 twilio BLOCKED: status callback method not POST');
    process.exit(9);
  }

  console.log('RESET05 call_ended_note=backend_route_exists_not_set_on_IncomingPhoneNumber');
  console.log('RESET05 twilio=PASS');
})().catch((error) => {
  console.error(`RESET05 twilio failed: ${error.message || 'unknown'}`);
  process.exit(1);
});
