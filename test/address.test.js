import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ADDRESS_RULES,
  getInvalidUserDataFields,
  isUserDataValid,
  isValidAddress,
  toPostalAddress,
} from '../shared/utils/utils.js';

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

test('toPostalAddress', () => {
  assert.deepEqual(toPostalAddress('HINTERHOLZ 8, 1234 HINTERTUPFING IM NIRGENDWO'), {
    street: 'HINTERHOLZ 8',
    postalCode: '1234',
    city: 'HINTERTUPFING IM NIRGENDWO',
  });
  assert.deepEqual(toPostalAddress('Hauptstraße 1'), {
    street: 'Hauptstraße 1',
    postalCode: '',
    city: '',
  });
  const address = { street: 'Hauptstraße 1', postalCode: '1010', city: 'Wien' };
  assert.equal(toPostalAddress(address), address);
  assert.equal(toPostalAddress(''), undefined);
  assert.equal(toPostalAddress(null), undefined);
});

test('isValidAddress only requires all parts when rules are not checked', () => {
  const address = { street: 'Hauptstraße1', postalCode: '1010', city: 'Wien' };
  assert.equal(isValidAddress(address), false);
  assert.equal(isValidAddress(address, false), true);
  assert.equal(isValidAddress({ ...address, postalCode: '' }, false), false);
  assert.equal(isValidAddress(undefined, false), false);
});

test('isUserDataValid skips the address rules for login provided addresses', () => {
  const user = {
    name: 'Test',
    address: { street: 'Hart', postalCode: '5321', city: 'Koppl' },
    identifierType: 'GLN',
    identifierValue: '9001234567896',
  };
  assert.equal(isUserDataValid(user, 'OTP'), false);
  assert.equal(isUserDataValid(user, 'SMS'), false);
  assert.equal(isUserDataValid(user, 'IDA'), true);
  assert.equal(isUserDataValid(user, 'AMA'), true);
  assert.equal(isUserDataValid(user, 'USP'), true);
  const incomplete = { ...user, address: { ...user.address, postalCode: '' } };
  assert.equal(isUserDataValid(incomplete, 'IDA'), false);
  assert.deepEqual(getInvalidUserDataFields(incomplete, 'IDA'), ['address']);
});
