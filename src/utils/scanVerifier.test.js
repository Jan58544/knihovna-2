import { describe, expect, it } from 'vitest';
import { createIsbnScanVerifier } from './scanVerifier';

describe('camera ISBN confirmation', () => {
  it('accepts two identical reads within a frame interval without changing digits', () => {
    const scan = createIsbnScanVerifier();
    expect(scan('9788025703670', 0)).toBeNull();
    expect(scan('9788025703670', 42)).toBe('9788025703670');
  });
  it.each(['9788025703671', '9788O25703670', '978-80-257-0367-0', '4006381333931', 'abc9788025703670', '978802570367012'])('rejects invalid or non-book code %s even when repeated', (code) => {
    const scan = createIsbnScanVerifier();
    expect(scan(code, 0)).toBeNull();
    expect(scan(code, 42)).toBeNull();
  });
  it('does not confirm conflicting, invalid, stale, or same-frame reads', () => {
    const scan = createIsbnScanVerifier();
    expect(scan('9788025703670', 0)).toBeNull();
    expect(scan('9780306406157', 42)).toBeNull();
    expect(scan('9788025703670', 84)).toBeNull();
    expect(scan('bad', 100)).toBeNull();
    expect(scan('9788025703670', 126)).toBeNull();
    expect(scan('9788025703670', 700)).toBeNull();
    expect(scan('9788025703670', 700)).toBeNull();
    expect(scan('9788025703670', 742)).toBe('9788025703670');
  });
  it('supports ISBN-10 with X and starts fresh for each camera session', () => {
    const scan = createIsbnScanVerifier();
    expect(scan('080442957X', 0)).toBeNull();
    expect(scan('080442957X', 42)).toBe('080442957X');
    expect(createIsbnScanVerifier()('080442957X', 84)).toBeNull();
  });
});
