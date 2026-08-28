const assert = require('node:assert/strict');
const test = require('node:test');
const {
  isCatalogueLanguageCode,
  listCatalogueLanguages,
  RECOMMENDED_LANGUAGE_CODES,
} = require('../../dist/common/i18n/language-catalogue');

test('recommended starter codes are in the catalogue', () => {
  for (const code of RECOMMENDED_LANGUAGE_CODES) {
    assert.equal(isCatalogueLanguageCode(code), true);
  }
  assert.ok(
    listCatalogueLanguages().length > RECOMMENDED_LANGUAGE_CODES.length,
  );
});

test('rejects free-text and unknown codes', () => {
  assert.equal(isCatalogueLanguageCode('English'), false);
  assert.equal(isCatalogueLanguageCode('xx'), false);
  assert.equal(isCatalogueLanguageCode(''), false);
  assert.equal(isCatalogueLanguageCode('it'), true);
});
