import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ADDRESS_RULES,
  getInvalidUserDataFields,
  isUserDataValid,
  isValidAddress,
  normalizeAddressPart,
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

/** @param {string} v */
const validCity = (v) => ADDRESS_RULES.city.every((rule) => rule(v) === true);

const NBSP = String.fromCharCode(0xa0);
const SOFT_HYPHEN = String.fromCharCode(0xad);
const EN_DASH = String.fromCharCode(0x2013);
const RIGHT_QUOTE = String.fromCharCode(0x2019);

test('normalizeAddressPart', () => {
  assert.equal(normalizeAddressPart(` Haupt${SOFT_HYPHEN}straße${NBSP}1\t `), 'Hauptstraße 1');
  assert.equal(normalizeAddressPart(`Hauptstraße 1${EN_DASH}3`), 'Hauptstraße 1-3');
  assert.equal(normalizeAddressPart(`O${RIGHT_QUOTE}Brien-Gasse 2`), "O'Brien-Gasse 2");
  assert.equal(normalizeAddressPart(), '');
});

// Probed on TRACES acceptance: these are accepted as producer street
test('street allows what TRACES allows', () => {
  for (const street of [
    'Wörth 1',
    'A 1',
    'Hauptstraße 4/2/3',
    'Hauptstraße 1, Stiege 2',
    'Dr.-Karl-Renner-Ring 3',
    "O'Brien-Gasse 2",
    'Straße 1 : ½ ²',
    'Ulica 1 čłøдΩ',
    `Hauptstraße${NBSP}1`,
    `Hauptstraße 1${EN_DASH}3`,
  ]) {
    assert.equal(validStreet(street), true, street);
  }
});

// Probed on TRACES acceptance: these are rejected as producer street
test('street rejects what TRACES rejects', () => {
  for (const c of ';()&_+*?!@°"<>%$=~|\\#„“') {
    assert.equal(validStreet(`Hauptstraße 1 ${c}`), false, c);
  }
  assert.match(
    /** @type {string} */ (ADDRESS_RULES.street[2]?.('Hauptstraße 1 (Hof)')),
    /^Nicht erlaubt: \( \)/,
  );
});

test('city needs two characters including a letter and allowed characters only', () => {
  assert.equal(validCity('Wi'), true);
  assert.equal(validCity('St. Pölten'), true);
  assert.equal(validCity('Wien 1'), true);
  assert.equal(validCity(`Wien${NBSP}Stadt`), true);
  assert.equal(validCity('W'), false);
  assert.equal(validCity(' W '), false);
  assert.equal(validCity('12'), false);
  assert.equal(validCity('...'), false);
  assert.equal(validCity('Wien (Stadt)'), false);
  assert.equal(validCity('Wien_Stadt'), false);
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
