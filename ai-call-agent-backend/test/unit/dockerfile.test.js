const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');

const dockerfilePath = resolve(__dirname, '../../Dockerfile');
const dockerfile = readFileSync(dockerfilePath, 'utf8');

test('Dockerfile starts only the NestJS application', () => {
  assert.match(dockerfile, /CMD \["node", "dist\/main\.js"\]/);
  assert.doesNotMatch(dockerfile, /migration:run/);
  assert.doesNotMatch(dockerfile, /bootstrap-eazi-migrations/);
});

test('Dockerfile preserves migration tooling in image for controlled ECS tasks', () => {
  assert.match(dockerfile, /COPY --from=builder \/app\/dist \.\/dist/);
});

test('Dockerfile healthcheck targets /health/live on localhost', () => {
  assert.match(dockerfile, /HEALTHCHECK/);
  assert.match(dockerfile, /\/health\/live/);
  assert.match(dockerfile, /127\.0\.0\.1/);
  assert.match(dockerfile, /process\.env\.PORT \|\| 3000/);
  assert.doesNotMatch(dockerfile, /\/health\/ready/);
});
