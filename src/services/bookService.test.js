import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchBookByIsbn } from './bookService';

describe('bookService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches book by valid ISBN-13 via Google Books API', async () => {
    const mockGoogleResponse = {
      ok: true,
      json: async () => ({
        items: [
          {
            volumeInfo: {
              title: 'Test Book',
              authors: ['Author One'],
              industryIdentifiers: [
                { type: 'ISBN_13', identifier: '9780306406157' },
                { type: 'ISBN_10', identifier: '0306406152' },
              ],
            },
          },
        ],
      }),
    };

    fetch.mockResolvedValueOnce(mockGoogleResponse);

    const book = await fetchBookByIsbn('978-0-306-40615-7');
    expect(book).not.toBeNull();
    expect(book.title).toBe('Test Book');
    expect(book.authors).toBe('Author One');
    expect(fetch).toHaveBeenCalledWith(
      'https://www.googleapis.com/books/v1/volumes?q=isbn:9780306406157'
    );
  });

  it('tries alternative ISBN-10 if ISBN-13 query returns no results', async () => {
    // 1st fetch (ISBN-13 query) returns no items
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    });

    // 2nd fetch (ISBN-10 alternative query) returns matching item
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            volumeInfo: {
              title: 'Alternative ISBN Match',
              authors: ['Author Two'],
              industryIdentifiers: [
                { type: 'ISBN_10', identifier: '0306406152' },
              ],
            },
          },
        ],
      }),
    });

    const book = await fetchBookByIsbn('9780306406157');
    expect(book).not.toBeNull();
    expect(book.title).toBe('Alternative ISBN Match');
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'https://www.googleapis.com/books/v1/volumes?q=isbn:9780306406157'
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'https://www.googleapis.com/books/v1/volumes?q=isbn:0306406152'
    );
  });

  it('rejects API results that return a book with non-matching ISBNs', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            volumeInfo: {
              title: 'Wrong Book',
              industryIdentifiers: [
                { type: 'ISBN_13', identifier: '9781111111111' },
              ],
            },
          },
        ],
      }),
    });

    // Mock subsequent calls (alt ISBN query and Open Library) to return no matches
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const book = await fetchBookByIsbn('9780306406157');
    expect(book).toBeNull();
  });

  it('falls back to Open Library when Google Books finds no match', async () => {
    // Google Books primary and alt returns 0 items
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) });
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ items: [] }) });

    // Open Library returns match
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        'ISBN:9780306406157': {
          title: 'Open Library Book',
          authors: [{ name: 'OL Author' }],
        },
      }),
    });

    const book = await fetchBookByIsbn('9780306406157');
    expect(book).not.toBeNull();
    expect(book.title).toBe('Open Library Book');
    expect(book.authors).toBe('OL Author');
  });

  it('performs title and author fallback search if options are provided', async () => {
    // Google Books and Open Library fail
    fetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    // Fallback title/author query call
    fetch.mockImplementation((url) => {
      if (decodeURIComponent(url).includes('intitle:The Hobbit')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            items: [
              {
                volumeInfo: {
                  title: 'The Hobbit',
                  authors: ['J.R.R. Tolkien'],
                  industryIdentifiers: [{ type: 'ISBN_10', identifier: '0007458421' }],
                },
              },
            ],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const book = await fetchBookByIsbn('INVALID', { title: 'The Hobbit', author: 'Tolkien' });
    expect(book).not.toBeNull();
    expect(book.title).toBe('The Hobbit');
    expect(book.authors).toBe('J.R.R. Tolkien');
  });

  it('corrects OCR errors like "O" instead of "0" before querying API', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            volumeInfo: {
              title: 'OCR Corrected Book',
              authors: ['OCR Author'],
              industryIdentifiers: [{ type: 'ISBN_10', identifier: '0306406152' }],
            },
          },
        ],
      }),
    });

    const book = await fetchBookByIsbn('O306406152');
    expect(book).not.toBeNull();
    expect(book.title).toBe('OCR Corrected Book');
    expect(fetch).toHaveBeenCalledWith(
      'https://www.googleapis.com/books/v1/volumes?q=isbn:0306406152'
    );
  });
});
