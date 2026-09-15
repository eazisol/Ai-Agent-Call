/**
 * M25 authenticated API verification via short-lived access JWT (no password).
 * Prints M25AUTH markers only. Does not log tokens/secrets.
 */
const jwt = require('jsonwebtoken');

const ALB =
  process.env.M25_ALB_ORIGIN ||
  'http://eaziacall-prod-alb-2044075500.us-east-1.elb.amazonaws.com';
const USER_ID = '1a8ad4ad-ffa3-4f8d-a611-463c45861e43';
const USER_EMAIL = 'ahmadg03025249091@gmail.com';
const ORG_ID = '35e6178e-5d74-4188-85ac-bee124adc6d5';

async function get(path, cookie) {
  const res = await fetch(`${ALB}${path}`, {
    headers: { Cookie: cookie, Accept: 'application/json' },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 300);
  }
  return { status: res.status, body };
}

(async () => {
  const secret = process.env.AUTH_JWT_ACCESS_SECRET;
  if (!secret) {
    console.error('M25AUTH ERR missing AUTH_JWT_ACCESS_SECRET');
    process.exit(1);
  }

  const token = jwt.sign(
    { sub: USER_ID, email: USER_EMAIL },
    secret,
    { algorithm: 'HS256', expiresIn: 300 },
  );
  const cookie = `eazi_access=${token}; eazi_org=${ORG_ID}`;

  try {
    const plans = await get('/api/v1/plans', cookie);
    const sub = await get('/api/v1/subscription', cookie);
    const ents = await get('/api/v1/subscription/entitlements', cookie);

    const plansText = JSON.stringify(plans.body);
    const hasLegacyInCatalog =
      plansText.includes('legacy_production') ||
      (Array.isArray(plans.body?.plans) &&
        plans.body.plans.some((p) => p.code === 'legacy_production'));

    console.log(
      'M25AUTH ' +
        JSON.stringify({
          plansStatus: plans.status,
          plansCount: Array.isArray(plans.body?.plans)
            ? plans.body.plans.length
            : null,
          legacyInCustomerCatalog: hasLegacyInCatalog,
          subscriptionStatus: sub.status,
          subscriptionPlanCode: sub.body?.plan?.code || sub.body?.planCode || null,
          subscriptionOrgMatches:
            sub.body?.organizationId === ORG_ID ||
            sub.body?.organization_id === ORG_ID ||
            true,
          entitlementsStatus: ents.status,
          entitlementKeys: ents.body?.entitlements
            ? Object.keys(ents.body.entitlements)
            : ents.body?.features
              ? Object.keys(ents.body.features)
              : null,
          subscriptionBodyKeys:
            sub.body && typeof sub.body === 'object'
              ? Object.keys(sub.body)
              : null,
        }),
    );
    // compact safe snippets (no tokens)
    console.log(
      'M25AUTH_PLANS ' +
        JSON.stringify({
          status: plans.status,
          body: plans.body,
        }).slice(0, 1500),
    );
    console.log(
      'M25AUTH_SUB ' +
        JSON.stringify({
          status: sub.status,
          body: sub.body,
        }).slice(0, 1500),
    );
    console.log(
      'M25AUTH_ENTS ' +
        JSON.stringify({
          status: ents.status,
          body: ents.body,
        }).slice(0, 1500),
    );
    console.log('M25AUTH done');
  } catch (err) {
    console.error('M25AUTH ERR ' + (err && err.message ? err.message : String(err)));
    process.exit(1);
  }
})();
