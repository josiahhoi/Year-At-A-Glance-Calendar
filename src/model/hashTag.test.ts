import { describe, expect, it } from 'vitest';
import { isHashTitle, stripHash, withHash } from './hashTag';

describe('hashTag', () => {
  it('detects the marker', () => {
    expect(isHashTitle('#Vacation')).toBe(true);
    expect(isHashTitle('# Vacation')).toBe(true);
    expect(isHashTitle('#')).toBe(true);
    expect(isHashTitle('Vacation')).toBe(false);
    expect(isHashTitle('Team #sync')).toBe(false);
  });

  it('strips the marker and any following whitespace', () => {
    expect(stripHash('#Vacation')).toBe('Vacation');
    expect(stripHash('# Vacation')).toBe('Vacation');
    expect(stripHash('#  Honduras Trip')).toBe('Honduras Trip');
    expect(stripHash('#')).toBe('');
    expect(stripHash('no marker')).toBe('no marker');
  });

  it('adds the marker', () => {
    expect(withHash('Vacation')).toBe('#Vacation');
  });

  it('round-trips grid-created titles', () => {
    expect(stripHash(withHash('OC Marathon'))).toBe('OC Marathon');
  });

  it('only strips a leading marker, not interior hashes', () => {
    expect(stripHash('#Race #2')).toBe('Race #2');
  });
});
