import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADDRESS_RULES } from '../shared/utils/utils.js';

/** @param {string} v */
const validStreet = (v) => ADDRESS_RULES.street.every((rule) => rule(v) === true);

test('street requires a blank before the house number', () => {
  assert.equal(validStreet('Hauptstraße 1'), true);
  assert.equal(validStreet('Hauptstraße 12a'), true);
  assert.equal(validStreet('Hauptstraße 4/2/3'), true);
  assert.equal(validStreet('Am Hof  7'), true);
  assert.equal(validStreet('Hauptstraße1'), false);
  assert.equal(validStreet('Hauptstraße'), false);
  assert.equal(validStreet('12'), false);
  assert.equal(validStreet(''), false);
});
