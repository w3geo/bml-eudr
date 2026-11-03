import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isUserDataValid, validateIdentifier } from '../shared/utils/utils.js';

test('GLN', () => {
  assert.equal(validateIdentifier('GLN', '4006381333931'), true);
  assert.equal(validateIdentifier('GLN', ' 4006381333931 '), true);
  assert.equal(typeof validateIdentifier('GLN', '4006381333932'), 'string');
  assert.equal(typeof validateIdentifier('GLN', '400638133393'), 'string');
  assert.equal(typeof validateIdentifier('GLN', '400638133393a'), 'string');
});

test('TIN', () => {
  assert.equal(validateIdentifier('TIN', '59-119/9013'), true);
  assert.equal(validateIdentifier('TIN', '591199013'), true);
  assert.equal(validateIdentifier('TIN', '59 119/9013'), true);
  assert.equal(typeof validateIdentifier('TIN', '59-119/9014'), 'string');
  assert.equal(typeof validateIdentifier('TIN', '59-119/901'), 'string');
});

test('VAT', () => {
  assert.equal(validateIdentifier('VAT', 'ATU13585627'), true);
  assert.equal(typeof validateIdentifier('VAT', 'ATU13585626'), 'string');
  assert.equal(typeof validateIdentifier('VAT', 'U13585627'), 'string');
  assert.equal(typeof validateIdentifier('VAT', 'DE123456789'), 'string');
});

test('ONI is not checked', () => {
  assert.equal(validateIdentifier('ONI', '1234567'), true);
});

test('isUserDataValid skips the check for login provided identifiers', () => {
  const user = {
    name: 'Test',
    address: 'Hauptstraße 1, 1010 Wien',
    identifierType: 'GLN',
    identifierValue: '1234567890123',
  };
  assert.equal(isUserDataValid(user, 'OTP'), false);
  assert.equal(isUserDataValid(user, 'IDA'), false);
  assert.equal(isUserDataValid(user, 'AMA'), true);
  assert.equal(isUserDataValid(user, 'USP'), true);
  assert.equal(isUserDataValid({ ...user, identifierValue: '4006381333931' }, 'OTP'), true);
});
