// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { GENRES_LIST, detectGenre, groupBooksByGenre } from './genres';

describe('genres utility', () => {
  it('contains GENRES_LIST with unique requested genres', () => {
    expect(Array.isArray(GENRES_LIST)).toBe(true);
    expect(GENRES_LIST.length).toBeGreaterThan(100);
    expect(GENRES_LIST).toContain('Fantasy');
    expect(GENRES_LIST).toContain('Sci-fi');
    expect(GENRES_LIST).toContain('Detektivka');
    expect(GENRES_LIST).toContain('Román');

    // Check uniqueness
    const unique = new Set(GENRES_LIST);
    expect(unique.size).toBe(GENRES_LIST.length);
  });

  it('detects genre correctly from book metadata', () => {
    expect(detectGenre({ title: 'Harry Potter a Kámen mudrců', description: 'Fantasy román' })).toBe('Fantasy');
    expect(detectGenre({ title: 'Vražda v Orient-expresu', description: 'Detektivka' })).toBe('Detektivka');
    expect(detectGenre({ title: 'Duna', description: 'Sci-fi vesmírná kronika' })).toBe('Sci-fi');
    expect(detectGenre({ title: 'Neznámý titulek' })).toBe('Román');
  });

  it('groups books by genre and excludes categories with 0 books', () => {
    const books = [
      { id: '1', title: 'Kniha 1', genre: 'Fantasy' },
      { id: '2', title: 'Kniha 2', genre: 'Fantasy' },
      { id: '3', title: 'Kniha 3', genre: 'Sci-fi' },
    ];

    const grouped = groupBooksByGenre(books);

    // Should contain only Fantasy and Sci-fi
    expect(grouped.length).toBe(2);
    expect(grouped[0].genre).toBe('Fantasy');
    expect(grouped[0].books.length).toBe(2);
    expect(grouped[1].genre).toBe('Sci-fi');
    expect(grouped[1].books.length).toBe(1);

    // Verify no empty categories exist in output
    grouped.forEach((group) => {
      expect(group.books.length).toBeGreaterThan(0);
    });
  });

  it('returns empty array when books list is empty', () => {
    expect(groupBooksByGenre([])).toEqual([]);
    expect(groupBooksByGenre(null)).toEqual([]);
  });
});
