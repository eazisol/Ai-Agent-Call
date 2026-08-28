const assert = require('node:assert/strict');
const test = require('node:test');
const nodemailer = require('nodemailer');
const {
  SmtpEmailAdapter,
} = require('../../dist/infrastructure/email/smtp-email.adapter');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');

function configOf(values) {
  return {
    get: (key) => values[key],
    getOrThrow: (key) => {
      if (values[key] === undefined) {
        throw new Error(`missing ${key}`);
      }
      return values[key];
    },
  };
}

test('SMTP adapter retries once then surfaces EMAIL_DELIVERY_FAILED', async () => {
  let attempts = 0;
  const original = nodemailer.createTransport;
  nodemailer.createTransport = () => ({
    sendMail: async () => {
      attempts += 1;
      throw new Error('smtp-down');
    },
  });

  try {
    const adapter = new SmtpEmailAdapter(
      configOf({
        'smtp.from': 'noreply@example.com',
        'smtp.host': 'smtp.example.com',
        'smtp.port': 587,
        'smtp.secure': false,
        'smtp.timeoutMs': 1000,
      }),
    );

    await assert.rejects(
      () =>
        adapter.send({
          to: 'user@example.com',
          subject: 'Test',
          text: 'Body',
        }),
      (error) =>
        error instanceof ApplicationError &&
        error.code === 'EMAIL_DELIVERY_FAILED',
    );
    assert.equal(attempts, 2);
  } finally {
    nodemailer.createTransport = original;
  }
});

test('SMTP adapter reports EMAIL_NOT_CONFIGURED without host', async () => {
  const adapter = new SmtpEmailAdapter(
    configOf({
      'smtp.from': 'noreply@example.com',
    }),
  );

  await assert.rejects(
    () =>
      adapter.send({
        to: 'user@example.com',
        subject: 'Test',
        text: 'Body',
      }),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'EMAIL_NOT_CONFIGURED',
  );
});
