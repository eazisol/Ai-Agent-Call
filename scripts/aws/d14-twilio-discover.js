const twilio = require('twilio');

const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();

(async () => {
  if (!accountSid || !authToken) {
    console.error('D14 twilio_discover BLOCKED: credentials missing');
    process.exit(2);
  }

  const client = twilio(accountSid, authToken);
  const numbers = await client.incomingPhoneNumbers.list({ limit: 20 });
  console.log(`D14 twilio_discover_count=${numbers.length}`);

  for (const row of numbers) {
    console.log(`D14 twilio_discover_sid=${row.sid}`);
    console.log(`D14 twilio_discover_phone=${row.phoneNumber}`);
    console.log(`D14 twilio_discover_voice_url=${row.voiceUrl || ''}`);
    console.log(`D14 twilio_discover_status_callback=${row.statusCallback || ''}`);
  }

  if (numbers.length === 1) {
    console.log(`D14 twilio_discover_canonical_sid=${numbers[0].sid}`);
    console.log(`D14 twilio_discover_canonical_phone=${numbers[0].phoneNumber}`);
    console.log('D14 twilio_discover=PASS');
    return;
  }

  console.error('D14 twilio_discover BLOCKED: ambiguous Twilio inventory');
  process.exit(3);
})().catch((error) => {
  console.error(`D14 twilio discover failed: ${error.message || 'unknown'}`);
  process.exit(1);
});
