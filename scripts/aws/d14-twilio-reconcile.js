const twilio = require('twilio');

const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
const phoneSid = (process.env.D14_PHONE_SID || '').trim();
const incomingUrl = (process.env.D14_INCOMING_URL || '').trim();
const statusUrl = (process.env.D14_STATUS_URL || '').trim();

const stalePatterns = [
  /localhost/i,
  /127\.0\.0\.1/,
  /ngrok/i,
  /\.elb\.amazonaws\.com/i,
  /vercel\.app/i,
];

function isStale(url) {
  if (!url) return true;
  return stalePatterns.some((pattern) => pattern.test(url));
}

(async () => {
  if (!accountSid || !authToken) {
    console.error('D14 twilio BLOCKED: credentials missing from environment');
    process.exit(2);
  }
  if (!phoneSid || !incomingUrl || !statusUrl) {
    console.error('D14 twilio BLOCKED: phone SID or target URLs missing');
    process.exit(3);
  }

  const client = twilio(accountSid, authToken);

  const account = await client.api.accounts(accountSid).fetch();
  console.log(`D14 twilio_account_status=${account.status}`);

  const number = await client.incomingPhoneNumbers(phoneSid).fetch();
  console.log(`D14 twilio_phone_sid=${number.sid}`);
  console.log(`D14 twilio_phone_number=${number.phoneNumber}`);
  console.log(`D14 twilio_voice_url=${number.voiceUrl || ''}`);
  console.log(`D14 twilio_voice_method=${number.voiceMethod || ''}`);
  console.log(`D14 twilio_status_callback=${number.statusCallback || ''}`);
  console.log(
    `D14 twilio_status_callback_method=${number.statusCallbackMethod || ''}`,
  );

  let updated = false;
  const needsUpdate =
    number.voiceUrl !== incomingUrl ||
    (number.voiceMethod || '').toUpperCase() !== 'POST' ||
    number.statusCallback !== statusUrl ||
    (number.statusCallbackMethod || '').toUpperCase() !== 'POST' ||
    isStale(number.voiceUrl) ||
    isStale(number.statusCallback);

  if (needsUpdate) {
    await client.incomingPhoneNumbers(phoneSid).update({
      voiceUrl: incomingUrl,
      voiceMethod: 'POST',
      statusCallback: statusUrl,
      statusCallbackMethod: 'POST',
    });
    updated = true;
    const refreshed = await client.incomingPhoneNumbers(phoneSid).fetch();
    console.log(`D14 twilio_voice_url=${refreshed.voiceUrl || ''}`);
    console.log(`D14 twilio_voice_method=${refreshed.voiceMethod || ''}`);
    console.log(`D14 twilio_status_callback=${refreshed.statusCallback || ''}`);
    console.log(
      `D14 twilio_status_callback_method=${refreshed.statusCallbackMethod || ''}`,
    );
  }

  const finalNumber = updated
    ? await client.incomingPhoneNumbers(phoneSid).fetch()
    : number;

  if (finalNumber.voiceUrl !== incomingUrl) {
    console.error('D14 twilio BLOCKED: voice URL mismatch after reconcile');
    process.exit(4);
  }
  if ((finalNumber.voiceMethod || '').toUpperCase() !== 'POST') {
    console.error('D14 twilio BLOCKED: voice method is not POST');
    process.exit(5);
  }
  if (finalNumber.statusCallback !== statusUrl) {
    console.error('D14 twilio BLOCKED: status callback URL mismatch');
    process.exit(6);
  }
  if (isStale(finalNumber.voiceUrl) || isStale(finalNumber.statusCallback)) {
    console.error('D14 twilio BLOCKED: stale provider URLs remain');
    process.exit(7);
  }

  console.log(`D14 twilio_updated=${updated ? 'yes' : 'no'}`);
  console.log('D14 twilio_reconcile=PASS');
})().catch((error) => {
  console.error(
    `D14 twilio reconcile failed: ${error.message || 'unknown error'}`,
  );
  process.exit(1);
});
