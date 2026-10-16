import {
  cleanIsbn,
  isValidIsbn,
  attemptOcrCorrection,
  isbn10To13,
} from '../utils/isbnUtils';
import { detectGenre } from '../utils/genres';

const KNIHOVNY_API_URL = 'https://www.knihovny.cz/api/v1/search';
const REQUEST_FIELDS = [
  'id',
  'title',
  'authors',
  'publishers',
  'placesOfPublication',
  'publicationDates',
  'physicalDescriptions',
  'isbns',
  'issns',
  'cnb',
  'formats',
  'subjects',
];

/**
 * Strips cataloguing punctuation from the end of a string.
 * e.g., "Argo," -> "Argo", "Praha :" -> "Praha"
 * @param {string} str
 * @returns {string}
 */
export function stripCatalogPunctuation(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[\s,:/;]+$/, '').trim();
}

/**
 * Formats author key by removing trailing dates/years.
 * e.g., "Jean de Nostredame, asi 1507-1577" -> "Jean de Nostredame"
 * e.g., "Josef Prokop, 1971-" -> "Josef Prokop"
 * @param {string} key
 * @returns {string}
 */
export function formatAuthorKey(key) {
  if (!key || typeof key !== 'string') return '';
  return key.replace(/,?\s*(?:asi\s*)?\d{4}.*$/, '').trim();
}

/**
 * Extracts author string from Knihovny.cz authors object.
 * @param {Object} authorsObj
 * @returns {string}
 */
export function extractAuthors(authorsObj) {
  if (!authorsObj || typeof authorsObj !== 'object') return 'Neznámý autor';

  const primaryKeys = Object.keys(authorsObj.primary || {});
  if (primaryKeys.length > 0) {
    const formatted = primaryKeys.map(formatAuthorKey).filter(Boolean);
    if (formatted.length > 0) return formatted.join(', ');
  }

  const secondaryKeys = Object.keys(authorsObj.secondary || {});
  if (secondaryKeys.length > 0) {
    const formatted = secondaryKeys.map(formatAuthorKey).filter(Boolean);
    if (formatted.length > 0) return formatted.join(', ');
  }

  if (Array.isArray(authorsObj.corporate) && authorsObj.corporate.length > 0) {
    const formatted = authorsObj.corporate.map(stripCatalogPunctuation).filter(Boolean);
    if (formatted.length > 0) return formatted.join(', ');
  }

  return 'Neznámý autor';
}

/**
 * Extracts 4-digit publication year from publicationDates array.
 * @param {Array<string>} dates
 * @returns {string|null}
 */
export function extractPublicationYear(dates) {
  if (!Array.isArray(dates) || dates.length === 0) return null;
  for (const dateStr of dates) {
    if (typeof dateStr === 'string') {
      const match = dateStr.match(/\d{4}/);
      if (match) return match[0];
    }
  }
  return null;
}

/**
 * Extracts numeric page count from physicalDescriptions array.
 * @param {Array<string>} descriptions
 * @returns {number|null}
 */
export function extractPageCount(descriptions) {
  if (!Array.isArray(descriptions) || descriptions.length === 0) return null;
  const desc = descriptions[0];
  if (typeof desc !== 'string') return null;
  const match = desc.match(/(\d+)\s*(?:s\.|stran|str|pages|p\.)/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Formats Knihovny.cz record object into standard book object.
 * @param {Object} record
 * @param {string} [fallbackIsbn='']
 * @returns {Object}
 */
export function formatKnihovnyBook(record, fallbackIsbn = '') {
  const cleanTitle = stripCatalogPunctuation(record.title || 'Bez názvu');
  const authorsStr = extractAuthors(record.authors);

  let publisherStr = null;
  if (Array.isArray(record.publishers) && record.publishers.length > 0) {
    publisherStr = stripCatalogPunctuation(record.publishers[0]);
  }

  const pubYear = extractPublicationYear(record.publicationDates);
  const pageCount = extractPageCount(record.physicalDescriptions);

  let displayIsbn = cleanIsbn(fallbackIsbn);
  if (!displayIsbn && Array.isArray(record.isbns) && record.isbns.length > 0) {
    displayIsbn = cleanIsbn(record.isbns[0]);
  }

  let coverUrl = null;
  if (record.id) {
    coverUrl = `https://www.knihovny.cz/Cover/Show?id=${encodeURIComponent(record.id)}&size=large`;
  } else if (displayIsbn) {
    coverUrl = `https://covers.openlibrary.org/b/isbn/${displayIsbn}-M.jpg`;
  }

  let description = null;
  if (Array.isArray(record.physicalDescriptions) && record.physicalDescriptions.length > 0) {
    description = record.physicalDescriptions.join(', ');
  }

  const bookObj = {
    id: record.id || `${displayIsbn || 'BOOK'}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    isbn: displayIsbn,
    title: cleanTitle,
    authors: authorsStr,
    publisher: publisherStr,
    publishedDate: pubYear,
    description: description,
    pageCount: pageCount,
    coverUrl: coverUrl,
    scannedAt: new Date().toISOString(),
    cnb: record.cnb ?? null,
    subjects: record.subjects || [],
    formats: record.formats || [],
  };

  bookObj.genre = detectGenre(bookObj);
  return bookObj;
}

/**
 * Executes a search request against Knihovny.cz API with an 8-second timeout.
 * @param {Object} options - { lookfor, type, limit }
 * @returns {Promise<Array<Object>>}
 */
async function searchKnihovnyApi({ lookfor, type, limit = '10' }) {
  const params = new URLSearchParams({ lookfor, type, limit: String(limit) });
  for (const field of REQUEST_FIELDS) {
    params.append('field[]', field);
  }

  const url = `${KNIHOVNY_API_URL}?${params.toString()}`;
  console.log(`[scan] [bookService] Requesting Knihovny.cz API URL: ${url}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    console.log(`[scan] [bookService] Knihovny.cz response status: ${response ? response.status : 'N/A'}`);
    if (!response || !response.ok) {
      return [];
    }

    const data = await response.json();
    return data.records ?? [];
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(`[scan] [bookService] Error requesting URL ${url}:`, err);
    return [];
  }
}

/**
 * Checks if a Knihovny.cz record contains the target 13-digit ISBN in its `isbns` array.
 * @param {Object} record
 * @param {string} target13Isbn
 * @returns {boolean}
 */
function recordMatchesIsbn(record, target13Isbn) {
  if (!record || !Array.isArray(record.isbns)) return false;

  for (const rawIsbn of record.isbns) {
    const cleaned = cleanIsbn(rawIsbn);
    if (!cleaned) continue;

    let clean13 = cleaned;
    if (cleaned.length === 10) {
      const converted = isbn10To13(cleaned);
      if (converted) clean13 = converted;
    }

    if (clean13 === target13Isbn) {
      return true;
    }
  }

  return false;
}

/**
 * Fetches book details by ISBN or search text from Knihovny.cz API.
 *
 * @param {string} rawIsbn - ISBN string or search query
 * @param {Object} [options] - Optional additional search details { title, author }
 * @returns {Promise<Object|null>} Book object or null if not found.
 */
export async function fetchBookByIsbn(rawIsbn, options = {}) {
  const queryText = (rawIsbn || '').trim();
  console.log('[scan] [bookService] Raw input received:', queryText);

  if (!queryText && !options.title && !options.author) {
    return null;
  }

  // 1. Check if input is a valid ISBN or can be OCR-corrected to one
  let primaryIsbn = cleanIsbn(queryText);
  let isNormalizedValid = isValidIsbn(primaryIsbn);

  if (!isNormalizedValid && queryText) {
    console.log('[scan] [bookService] Direct ISBN validation failed. Attempting OCR error correction...');
    const corrected = attemptOcrCorrection(queryText);
    if (corrected) {
      console.log(`[scan] [bookService] OCR correction successful: "${queryText}" -> "${corrected}"`);
      primaryIsbn = corrected;
      isNormalizedValid = true;
    } else {
      console.warn('[scan] [bookService] OCR correction failed. Input is not a valid ISBN.');
    }
  }

  // 2. Perform ISBN Search (if valid ISBN)
  if (isNormalizedValid && primaryIsbn) {
    // Convert to 13-digit ISBN without hyphens prior to query
    let target13Isbn = primaryIsbn;
    if (primaryIsbn.length === 10) {
      const converted = isbn10To13(primaryIsbn);
      if (converted) {
        target13Isbn = converted;
      }
    }

    console.log(`[scan] [bookService] Querying Knihovny.cz with 13-digit ISBN: ${target13Isbn}`);
    const records = await searchKnihovnyApi({
      lookfor: target13Isbn,
      type: 'ISN',
      limit: '10',
    });

    // Pick record that actually contains target13Isbn in its isbns array
    const matchedRecord = records.find((rec) => recordMatchesIsbn(rec, target13Isbn));
    if (matchedRecord) {
      console.log('[scan] [bookService] Verified book found in Knihovny.cz:', matchedRecord.title);
      return formatKnihovnyBook(matchedRecord, target13Isbn);
    } else {
      console.warn('[scan] [bookService] No record returned from Knihovny.cz matched target ISBN:', target13Isbn);
    }
  }

  // 3. Fallback Search by Title, Author, or General query
  let fallbackType = 'AllFields';
  let fallbackLookfor = '';

  if (options.title) {
    fallbackType = 'Title';
    fallbackLookfor = options.title;
  } else if (options.author) {
    fallbackType = 'Author';
    fallbackLookfor = options.author;
  } else if (queryText && !isNormalizedValid) {
    fallbackType = 'Title';
    fallbackLookfor = queryText;
  }

  if (fallbackLookfor) {
    console.log(`[scan] [bookService] Querying Knihovny.cz fallback (${fallbackType}): "${fallbackLookfor}"`);
    const records = await searchKnihovnyApi({
      lookfor: fallbackLookfor,
      type: fallbackType,
      limit: '10',
    });

    if (records.length > 0) {
      // Prefer book format ("0/BOOKS/") if present
      const bookRecord = records.find((rec) => Array.isArray(rec.formats) && rec.formats.includes('0/BOOKS/')) || records[0];
      console.log('[scan] [bookService] Book found via Knihovny.cz fallback query:', bookRecord.title);
      return formatKnihovnyBook(bookRecord, primaryIsbn || '');
    }
  }

  console.warn('[scan] [bookService] Book search completed: No book found for given criteria.');
  return null;
}
