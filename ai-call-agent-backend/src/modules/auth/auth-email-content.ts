/**
 * Pure helpers for auth email link construction and verification copy.
 * Kept free of Nest DI so unit tests can assert URL/HTML without SMTP.
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildAuthAppLink(options: {
  publicAppUrl: string;
  path: string;
  token: string;
  next?: string;
}): string {
  const base = options.publicAppUrl.endsWith('/')
    ? options.publicAppUrl
    : `${options.publicAppUrl}/`;
  const path = options.path.startsWith('/') ? options.path : `/${options.path}`;
  const url = new URL(path, base);
  url.searchParams.set('token', options.token);
  if (options.next) {
    url.searchParams.set('next', options.next);
  }
  return url.toString();
}

export function buildVerificationEmailContent(verifyUrl: string): {
  subject: string;
  text: string;
  html: string;
} {
  const safeHref = escapeHtml(verifyUrl);
  const safeText = escapeHtml(verifyUrl);

  return {
    subject: 'Verify your EaziAICall email',
    text: [
      'Verify your EaziAICall email:',
      '',
      verifyUrl,
      '',
      'If clicking the link does not work, copy and paste it into your browser.',
    ].join('\n'),
    html: [
      '<p>Verify your EaziAICall email.</p>',
      `<p><a href="${safeHref}" target="_blank" rel="noopener noreferrer">Verify email</a></p>`,
      '<p>If the button does not work, copy and paste this link into your browser:</p>',
      `<p style="word-break:break-all;font-family:monospace;font-size:14px;">${safeText}</p>`,
    ].join(''),
  };
}
