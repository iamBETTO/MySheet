import { describe, expect, it } from 'vitest';
import { displayName, tidyDescription } from './names';

describe('names', () => {
  it('drops reference numbers from bank text', () => {
    expect(tidyDescription('ACME-DIRECT/5022/13009998')).toBe('ACME-DIRECT');
    expect(tidyDescription('CASH WITHDRAWAL/989/5022')).toBe('CASH WITHDRAWAL');
    expect(tidyDescription('SHOP/BRANCH 2')).toBe('SHOP · BRANCH 2');
    expect(tidyDescription('12345')).toBe('12345');
  });
  it('prefers the name the person gave', () => {
    expect(displayName({ payee: 'Coffee', description: 'XYZ/1' })).toBe('Coffee');
    expect(displayName({ payee: null, description: 'XYZ/1' })).toBe('XYZ');
  });
});

import { similarKey } from './names';
describe('similar places', () => {
  it('treats texts that differ only in numbers as the same place', () => {
    expect(similarKey('LIME*4 RIDES QYIE')).toBe(similarKey('LIME*2 RIDES QYIE'));
    expect(similarKey('SHOP/123')).toBe(similarKey('SHOP/456'));
    expect(similarKey('SHOP A')).not.toBe(similarKey('SHOP B'));
  });
});
