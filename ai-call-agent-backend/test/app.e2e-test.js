const assert = require('node:assert/strict');
const test = require('node:test');
const { Test } = require('@nestjs/testing');
const request = require('supertest');
const { AppController } = require('../dist/app.controller');
const { AppService } = require('../dist/app.service');

test('EaziAiCall API reports its service identity', async () => {
  const module = await Test.createTestingModule({
    controllers: [AppController],
    providers: [AppService],
  }).compile();
  const app = module.createNestApplication();
  app.setGlobalPrefix('api/v1');
  await app.init();

  const response = await request(app.getHttpServer())
    .get('/api/v1')
    .expect(200);
  assert.deepEqual(response.body, {
    name: 'EaziAiCall',
    status: 'ok',
    apiVersion: 'v1',
  });
  await app.close();
});
