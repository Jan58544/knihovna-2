import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchBookByIsbn,
  prefetchBookByIsbn,
  stripCatalogPunctuation,
  formatAuthorKey,
  extractAuthors,
  extractPublicationYear,
  extractPageCount,
  formatKnihovnyBook,
} from './bookService';

describe('bookService - Knihovny.cz Integration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const sampleKnihovnyResponse = {
    resultCount: 1,
    records: [
      {
        id: 'mkp.3521868',
        title: 'Životy slavných a starých provensálských básníků, kteří žili v dobách hrabat z kraje Provença',
        authors: {
          primary: { 'Jean de Nostredame, asi 1507-1577': [] },
          secondary: { 'Josef Prokop, 1971-': [], 'Vojtěch Domlátil, 1979-': [] },
          corporate: [],
        },
        publishers: ['Argo,'],
        placesOfPublication: ['Praha :'],
        publicationDates: ['2011'],
        physicalDescriptions: ['218 s. : il. ; 22 cm'],
        isbns: ['978-80-257-0367-0'],
        issns: [],
        cnb: 'cnb002163342',
        formats: ['0/BOOKS/'],
      },
    ],
    status: 'OK',
  };

  it('starts lookup before confirmation and reuses the in-flight request', async () => {
    let resolveRequest;
    fetch.mockReturnValueOnce(new Promise(resolve => { resolveRequest = resolve; }));
    prefetchBookByIsbn('9788025703670');
    prefetchBookByIsbn('9788025703670');
    expect(fetch).toHaveBeenCalledTimes(1);
    const confirmed = fetchBookByIsbn('9788025703670');
    expect(fetch).toHaveBeenCalledTimes(1);
    resolveRequest({ ok: true, status: 200, json: async () => sampleKnihovnyResponse });
    expect((await confirmed).isbn).toBe('9788025703670');
  });

  it('never prefetches invalid camera ISBNs', () => {
    prefetchBookByIsbn('9788025703671');
    prefetchBookByIsbn('9788O25703670');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('expires prefetched results and fetches again after 15 seconds', async () => {
    fetch.mockResolvedValue({ ok: true, status: 200, json: async () => sampleKnihovnyResponse });
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    prefetchBookByIsbn('9788025703670');
    vi.mocked(Date.now).mockReturnValue(now + 15001);
    await fetchBookByIsbn('9788025703670');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('fetches book by valid 13-digit ISBN via Knihovny.cz API and parses sample response', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => sampleKnihovnyResponse,
    });

    const book = await fetchBookByIsbn('978-80-257-0367-0');
    expect(book).not.toBeNull();
    expect(book.id).toBe('mkp.3521868');
    expect(book.title).toBe(
      'Životy slavných a starých provensálských básníků, kteří žili v dobách hrabat z kraje Provença'
    );
    expect(book.authors).toBe('Jean de Nostredame');
    expect(book.publisher).toBe('Argo');
    expect(book.publishedDate).toBe('2011');
    expect(book.pageCount).toBe(218);
    expect(book.cnb).toBe('cnb002163342');
    expect(book.isbn).toBe('9788025703670');
    expect(book.coverUrl).toBe('https://www.knihovny.cz/Cover/Show?id=mkp.3521868&size=large');

    expect(fetch).toHaveBeenCalledTimes(1);
    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain('https://www.knihovny.cz/api/v1/search?');
    expect(calledUrl).toContain('lookfor=9788025703670');
    expect(calledUrl).toContain('type=ISN');
    expect(calledUrl).toContain('limit=10');
    expect(calledUrl).toContain('field%5B%5D=id');
    expect(calledUrl).toContain('field%5B%5D=title');
    expect(calledUrl).toContain('field%5B%5D=authors');
  });

  it('converts 10-digit ISBN to 13-digit prior to querying Knihovny.cz API', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        resultCount: 1,
        records: [
          {
            id: 'test.123',
            title: 'Test Book',
            authors: { primary: { 'Test Author, 1980-': [] } },
            isbns: ['978-0-306-40615-7'],
            formats: ['0/BOOKS/'],
          },
        ],
        status: 'OK',
      }),
    });

    // 0306406152 -> ISBN-13 is 9780306406157
    const book = await fetchBookByIsbn('0306406152');
    expect(book).not.toBeNull();
    expect(book.title).toBe('Test Book');

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain('lookfor=9780306406157');
  });

  it('handles resultCount: 0 with missing records property gracefully', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        resultCount: 0,
        status: 'OK',
      }),
    });

    const book = await fetchBookByIsbn('9788025703670');
    expect(book).toBeNull();
  });

  it('rejects records that do not contain the target ISBN in isbns array', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        resultCount: 1,
        records: [
          {
            id: 'other.123',
            title: 'Different Edition',
            isbns: ['978-1-111-11111-1'],
          },
        ],
        status: 'OK',
      }),
    });

    const book = await fetchBookByIsbn('9788025703670');
    expect(book).toBeNull();
  });

  it('performs fallback search by title and prefers "0/BOOKS/" format', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        resultCount: 2,
        records: [
          {
            id: 'audio.123',
            title: 'Saturnin [zvukový záznam]',
            formats: ['0/AUDIO/'],
          },
          {
            id: 'book.123',
            title: 'Saturnin',
            authors: { primary: { 'Zdeněk Jirotka, 1911-2003': [] } },
            formats: ['0/BOOKS/'],
          },
        ],
        status: 'OK',
      }),
    });

    const book = await fetchBookByIsbn('Saturnin');
    expect(book).not.toBeNull();
    expect(book.id).toBe('book.123');
    expect(book.title).toBe('Saturnin');
    expect(book.authors).toBe('Zdeněk Jirotka');
  });

  it('corrects OCR errors in ISBN before querying Knihovny.cz API', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => sampleKnihovnyResponse,
    });

    // "O" replaced with "0" in valid ISBN
    const book = await fetchBookByIsbn('97880257O3670');
    expect(book).not.toBeNull();
    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain('lookfor=9788025703670');
  });

  it('handles network failure gracefully without crashing', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const book = await fetchBookByIsbn('9788025703670');
    expect(book).toBeNull();
  });

  it('handles HTTP 500 error gracefully without crashing', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const book = await fetchBookByIsbn('9788025703670');
    expect(book).toBeNull();
  });

  it('handles malformed JSON gracefully without crashing', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    });

    const book = await fetchBookByIsbn('9788025703670');
    expect(book).toBeNull();
  });

  describe('Helper functions', () => {
    it('stripCatalogPunctuation removes trailing punctuation', () => {
      expect(stripCatalogPunctuation('Argo,')).toBe('Argo');
      expect(stripCatalogPunctuation('Praha :')).toBe('Praha');
      expect(stripCatalogPunctuation('[Praha] :')).toBe('[Praha]');
      expect(stripCatalogPunctuation('Clean Code /')).toBe('Clean Code');
    });

    it('formatAuthorKey strips trailing years/dates', () => {
      expect(formatAuthorKey('Jean de Nostredame, asi 1507-1577')).toBe('Jean de Nostredame');
      expect(formatAuthorKey('Josef Prokop, 1971-')).toBe('Josef Prokop');
      expect(formatAuthorKey('Karel Čapek, 1890-1938')).toBe('Karel Čapek');
      expect(formatAuthorKey('Jan Novák')).toBe('Jan Novák');
    });

    it('extractAuthors formats primary and secondary author keys', () => {
      const authors = {
        primary: { 'Author One, 1980-': [] },
        secondary: { 'Translator Two, 1985-': [] },
      };
      expect(extractAuthors(authors)).toBe('Author One');

      const secondaryOnly = {
        primary: {},
        secondary: { 'Translator Two, 1985-': [] },
      };
      expect(extractAuthors(secondaryOnly)).toBe('Translator Two');
    });

    it('extractPublicationYear extracts 4-digit year', () => {
      expect(extractPublicationYear(['2011'])).toBe('2011');
      expect(extractPublicationYear(['c2010'])).toBe('2010');
      expect(extractPublicationYear(['[2025]'])).toBe('2025');
      expect(extractPublicationYear([])).toBeNull();
    });

    it('extractPageCount extracts integer page count', () => {
      expect(extractPageCount(['218 s. : il. ; 22 cm'])).toBe(218);
      expect(extractPageCount(['260 stran'])).toBe(260);
      expect(extractPageCount([])).toBeNull();
    });

    it('formatKnihovnyBook formats record correctly', () => {
      const record = {
        id: 'mkp.123',
        title: 'Kniha ,',
        authors: { primary: { 'Autor, 1990-': [] } },
        publishers: ['Nakladatel,'],
        publicationDates: ['2020'],
        physicalDescriptions: ['150 s.'],
        isbns: ['978-80-12345-67-8'],
        cnb: 'cnb12345',
      };
      const formatted = formatKnihovnyBook(record, '9788012345678');
      expect(formatted.id).toBe('mkp.123');
      expect(formatted.title).toBe('Kniha');
      expect(formatted.authors).toBe('Autor');
      expect(formatted.publisher).toBe('Nakladatel');
      expect(formatted.publishedDate).toBe('2020');
      expect(formatted.pageCount).toBe(150);
      expect(formatted.cnb).toBe('cnb12345');
    });
  });
});
