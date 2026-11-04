import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADDRESS_RULES, isUserDataValid, isValidAddress } from '../shared/utils/utils.js';

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

test('isValidAddress only requires a parseable address when rules are not checked', () => {
  assert.equal(isValidAddress('Hauptstraße1, 1010 Wien'), false);
  assert.equal(isValidAddress('Hauptstraße1, 1010 Wien', false), true);
  assert.equal(isValidAddress('Hauptstraße 1', false), false);
});

test('isUserDataValid skips the address rules for login provided addresses', () => {
  const user = {
    name: 'Test',
    address: 'Hart, 5321 Koppl',
    identifierType: 'GLN',
    identifierValue: '4006381333931',
  };
  assert.equal(isUserDataValid(user, 'OTP'), false);
  assert.equal(isUserDataValid(user, 'SMS'), false);
  assert.equal(isUserDataValid(user, 'IDA'), true);
  assert.equal(isUserDataValid(user, 'AMA'), true);
  assert.equal(isUserDataValid(user, 'USP'), true);
});
