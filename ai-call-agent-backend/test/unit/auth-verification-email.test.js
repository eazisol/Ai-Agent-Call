const assert = require('node:assert/strict');
const test = require('node:test');
const {
  buildAuthAppLink,
  buildVerificationEmailContent,
  escapeHtml,
} = require('../../dist/modules/auth/auth-email-content');

const PROD_BASE = 'https://eazi-ai-call.vercel.app';

test('canonical verification URL uses production host path and token query', () => {
  const url = buildAuthAppLink({
    publicAppUrl: PROD_BASE,
    path: '/verify-email',
    token: 'plain-token-value',
  });
  const parsed = new URL(url);
  assert.equal(parsed.protocol, 'https:');
  assert.equal(parsed.host, 'eazi-ai-call.vercel.app');
  assert.equal(parsed.pathname, '/verify-email');
  assert.equal(parsed.searchParams.get('token'), 'plain-token-value');
  assert.equal(url, `${PROD_BASE}/verify-email?token=plain-token-value`);
});

test('token with URL-sensitive characters is encoded exactly once', () => {
  const token = 'abc+/=def?&x';
  const url = buildAuthAppLink({
    publicAppUrl: PROD_BASE,
    path: '/verify-email',
    token,
  });
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('token'), token);
  assert.ok(url.includes('token='));
  assert.equal(url.includes('%253D'), false, 'must not double-encode');
  assert.equal(url.includes('google.com'), false);
});

test('HTML button href and visible fallback use canonical direct URL', () => {
  const verifyUrl = buildAuthAppLink({
    publicAppUrl: PROD_BASE,
    path: '/verify-email',
    token: 'tok-with&=chars',
  });
  const content = buildVerificationEmailContent(verifyUrl);

  assert.match(
    content.html,
    /<a href="https:\/\/eazi-ai-call\.vercel\.app\/verify-email\?token=[^"]+" target="_blank" rel="noopener noreferrer">Verify email<\/a>/,
  );
  assert.match(
    content.html,
    /If the button does not work, copy and paste this link into your browser/,
  );
  assert.ok(content.html.includes(escapeHtml(verifyUrl)));
  assert.equal(content.html.includes('google.com'), false);
  assert.equal(content.html.includes('onclick'), false);
});

test('plain-text email contains canonical direct URL and copy guidance', () => {
  const verifyUrl = buildAuthAppLink({
    publicAppUrl: PROD_BASE,
    path: '/verify-email',
    token: 'plain-text-token',
  });
  const content = buildVerificationEmailContent(verifyUrl);
  assert.ok(content.text.includes(verifyUrl));
  assert.match(
    content.text,
    /If clicking the link does not work, copy and paste it into your browser/,
  );
  assert.equal(content.text.includes('google.com'), false);
  assert.equal(content.subject, 'Verify your EaziAICall email');
});

test('EaziAICall does not generate google.com redirect URLs', () => {
  const verifyUrl = buildAuthAppLink({
    publicAppUrl: PROD_BASE,
    path: '/verify-email',
    token: 'no-redirect',
  });
  const content = buildVerificationEmailContent(verifyUrl);
  for (const part of [verifyUrl, content.text, content.html, content.subject]) {
    assert.equal(String(part).toLowerCase().includes('google.com'), false);
    assert.equal(String(part).toLowerCase().includes('url?q='), false);
  }
});
