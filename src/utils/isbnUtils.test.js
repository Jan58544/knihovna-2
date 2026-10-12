import { describe, it, expect } from 'vitest';
import {
  cleanIsbn,
  isValidIsbn10,
  isValidIsbn13,
  isValidIsbn,
  isbn10To13,
  isbn13To10,
  attemptOcrCorrection,
} from './isbnUtils';

describe('ISBN Utilities', () => {
  describe('cleanIsbn', () => {
    it('removes spaces and hyphens', () => {
      expect(cleanIsbn('978-0-306-40615-7')).toBe('9780306406157');
      expect(cleanIsbn('0 8044 2957 X')).toBe('080442957X');
    });

    it('converts lowercase x to uppercase X', () => {
      expect(cleanIsbn('0-8044-2957-x')).toBe('080442957X');
    });

    it('handles empty or non-string input', () => {
      expect(cleanIsbn('')).toBe('');
      expect(cleanIsbn(null)).toBe('');
      expect(cleanIsbn(undefined)).toBe('');
    });
  });

  describe('isValidIsbn10', () => {
    it('validates correct ISBN-10 without hyphens', () => {
      expect(isValidIsbn10('0306406152')).toBe(true);
    });

    it('validates correct ISBN-10 with hyphens and spaces', () => {
      expect(isValidIsbn10('0-306-40615-2')).toBe(true);
    });

    it('validates correct ISBN-10 ending with X', () => {
      expect(isValidIsbn10('080442957X')).toBe(true);
      expect(isValidIsbn10('0-8044-2957-X')).toBe(true);
      expect(isValidIsbn10('0-8044-2957-x')).toBe(true);
    });

    it('rejects invalid ISBN-10 checksum', () => {
      expect(isValidIsbn10('0306406153')).toBe(false);
      expect(isValidIsbn10('0804429570')).toBe(false);
    });

    it('rejects incorrect length or characters', () => {
      expect(isValidIsbn10('12345')).toBe(false);
      expect(isValidIsbn10('X804429570')).toBe(false); // X only allowed at end
    });
  });

  describe('isValidIsbn13', () => {
    it('validates correct ISBN-13 without hyphens', () => {
      expect(isValidIsbn13('9780306406157')).toBe(true);
    });

    it('validates correct ISBN-13 with hyphens and spaces', () => {
      expect(isValidIsbn13('978-0-306-40615-7')).toBe(true);
      expect(isValidIsbn13('978 0 306 40615 7')).toBe(true);
    });

    it('rejects invalid ISBN-13 checksum', () => {
      expect(isValidIsbn13('9780306406158')).toBe(false);
    });

    it('rejects incorrect length', () => {
      expect(isValidIsbn13('978030640615')).toBe(false);
      expect(isValidIsbn13('97803064061570')).toBe(false);
    });
  });

  describe('isValidIsbn', () => {
    it('returns true for both valid ISBN-10 and ISBN-13', () => {
      expect(isValidIsbn('0306406152')).toBe(true);
      expect(isValidIsbn('080442957X')).toBe(true);
      expect(isValidIsbn('9780306406157')).toBe(true);
    });

    it('returns false for invalid inputs', () => {
      expect(isValidIsbn('1234567890')).toBe(false);
      expect(isValidIsbn('9780306406150')).toBe(false);
    });
  });

  describe('isbn10To13', () => {
    it('converts valid ISBN-10 to valid ISBN-13', () => {
      expect(isbn10To13('0306406152')).toBe('9780306406157');
      expect(isbn10To13('0-8044-2957-X')).toBe('9780804429573');
    });

    it('returns null for invalid inputs', () => {
      expect(isbn10To13('123')).toBe(null);
    });
  });

  describe('isbn13To10', () => {
    it('converts valid 978-prefix ISBN-13 to valid ISBN-10', () => {
      expect(isbn13To10('9780306406157')).toBe('0306406152');
      expect(isbn13To10('978-0-8044-2957-3')).toBe('080442957X');
    });

    it('returns null for 979 prefix or invalid length', () => {
      expect(isbn13To10('9791234567896')).toBe(null);
      expect(isbn13To10('12345')).toBe(null);
    });
  });

  describe('attemptOcrCorrection', () => {
    it('corrects O to 0', () => {
      expect(attemptOcrCorrection('O306406152')).toBe('0306406152');
      expect(attemptOcrCorrection('978O3O64O6157')).toBe('9780306406157');
    });

    it('corrects I/L to 1, S to 5, B to 8, G to 6', () => {
      // 978-0-306-40615-7 -> replacing 0 with O, 1 with I, 5 with S, 8 with B, 6 with G
      const misread = '978O3O64O6IS7';
      expect(attemptOcrCorrection(misread)).toBe('9780306406157');
    });

    it('returns null if input cannot be corrected to a valid ISBN', () => {
      expect(attemptOcrCorrection('INVALIDISBN123')).toBe(null);
    });
  });
});
