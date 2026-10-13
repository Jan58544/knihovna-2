import {
  cleanIsbn,
  isValidIsbn,
  attemptOcrCorrection,
  isbn10To13,
  isbn13To10,
} from '../utils/isbnUtils';

/**
 * Helper to check if a Google Books volume matches expected ISBNs.
 * @param {Object} volumeInfo
 * @param {Array<string>} targetIsbns
 * @returns {boolean}
 */
function isVolumeMatchingIsbn(volumeInfo, targetIsbns) {
  if (!volumeInfo) return false;
  const identifiers = volumeInfo.industryIdentifiers || [];
  const cleanTargets = targetIsbns.map(isbn => cleanIsbn(isbn)).filter(Boolean);

  if (identifiers.length > 0) {
    for (const item of identifiers) {
      const cleanedId = cleanIsbn(item.identifier);
      if (cleanTargets.includes(cleanedId)) {
        return true;
      }
    }
    // Identifiers exist but none matched target ISBNs
    return false;
  }

  // If no identifiers present on volumeInfo, assume true if it was returned by exact isbn query
  return true;
}

/**
 * Format Google Books item into standard book object.
 * @param {Object} item
 * @param {string} fallbackIsbn
 * @returns {Object}
 */
function formatGoogleBook(item, fallbackIsbn) {
  const info = item.volumeInfo || {};
  let coverUrl = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null;
  if (coverUrl) {
    coverUrl = coverUrl.replace(/^http:/, 'https:');
  }

  // Find best ISBN identifier from item if available
  let matchedIsbn = cleanIsbn(fallbackIsbn);
  if (info.industryIdentifiers && info.industryIdentifiers.length > 0) {
    const isbn13 = info.industryIdentifiers.find(id => id.type === 'ISBN_13')?.identifier;
    const isbn10 = info.industryIdentifiers.find(id => id.type === 'ISBN_10')?.identifier;
    const found = cleanIsbn(isbn13 || isbn10 || '');
    if (found) {
      matchedIsbn = found;
    }
  }

  return {
    id: `${matchedIsbn || 'BOOK'}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    isbn: matchedIsbn || fallbackIsbn || '',
    title: info.title || 'Untitled Book',
    authors: info.authors ? info.authors.join(', ') : 'Unknown Author',
    publisher: info.publisher || null,
    publishedDate: info.publishedDate || null,
    description: info.description || null,
    pageCount: info.pageCount || null,
    coverUrl: coverUrl,
    scannedAt: new Date().toISOString(),
  };
}

/**
 * Format Open Library book data into standard book object.
 * @param {Object} info
 * @param {string} fallbackIsbn
 * @returns {Object}
 */
function formatOpenLibraryBook(info, fallbackIsbn) {
  const authors = info.authors ? info.authors.map(a => a.name).join(', ') : 'Unknown Author';
  const coverUrl = info.cover?.large || info.cover?.medium || info.cover?.small || null;
  const cleanedFallback = cleanIsbn(fallbackIsbn);

  return {
    id: `${cleanedFallback || 'BOOK'}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    isbn: cleanedFallback || fallbackIsbn || '',
    title: info.title || 'Untitled Book',
    authors: authors,
    publisher: info.publishers ? info.publishers.map(p => p.name).join(', ') : null,
    publishedDate: info.publish_date || null,
    description: typeof info.notes === 'string' ? info.notes : null,
    pageCount: info.number_of_pages || null,
    coverUrl: coverUrl,
    scannedAt: new Date().toISOString(),
  };
}

/**
 * Fetches book details by ISBN or query text (title/author) with fallback and verification.
 *
 * @param {string} rawIsbn - ISBN string or search term
 * @param {Object} [options] - Optional additional search details { title, author }
 * @returns {Promise<Object|null>} Book object or null if not found.
 */
export async function fetchBookByIsbn(rawIsbn, options = {}) {
  const queryText = (rawIsbn || '').trim();
  console.log('[bookService] Raw input received:', queryText);

  if (!queryText && !options.title && !options.author) {
    return null;
  }

  let primaryIsbn = cleanIsbn(queryText);
  let isNormalizedValid = isValidIsbn(primaryIsbn);

  if (!isNormalizedValid && queryText) {
    console.log('[bookService] Direct ISBN validation failed. Attempting OCR error correction...');
    const corrected = attemptOcrCorrection(queryText);
    if (corrected) {
      console.log(`[bookService] OCR correction successful: "${queryText}" -> "${corrected}"`);
      primaryIsbn = corrected;
      isNormalizedValid = true;
    } else {
      console.warn('[bookService] OCR correction failed. Input is not a valid ISBN.');
    }
  }

  // Determine alternative ISBN format (ISBN-10 <-> ISBN-13)
  let alternativeIsbn = null;
  if (isNormalizedValid) {
    if (primaryIsbn.length === 10) {
      alternativeIsbn = isbn10To13(primaryIsbn);
    } else if (primaryIsbn.length === 13) {
      alternativeIsbn = isbn13To10(primaryIsbn);
    }
    console.log(`[bookService] Normalized ISBN: ${primaryIsbn} (Valid). Alternative: ${alternativeIsbn || 'N/A'}`);
  }

  const targetIsbns = [primaryIsbn, alternativeIsbn].filter(Boolean);

  // STEP 1: Query Google Books API with exact primary ISBN and alternative ISBN
  if (targetIsbns.length > 0) {
    for (const isbnToSearch of targetIsbns) {
      const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbnToSearch}`;
      console.log(`[bookService] Requesting Google Books API: ${url}`);

      try {
        const googleRes = await fetch(url);
        if (googleRes.ok) {
          const googleData = await googleRes.json();
          if (googleData.items && googleData.items.length > 0) {
            console.log(`[bookService] Google Books returned ${googleData.items.length} item(s). Verifying ISBN match...`);

            // Verify items against target ISBNs
            for (const item of googleData.items) {
              if (isVolumeMatchingIsbn(item.volumeInfo, targetIsbns)) {
                console.log('[bookService] Verified book found in Google Books:', item.volumeInfo.title);
                return formatGoogleBook(item, primaryIsbn);
              }
            }
            console.warn('[bookService] Google Books items did not match industryIdentifiers for ISBNs:', targetIsbns);
          } else {
            console.log(`[bookService] Google Books returned 0 items for q=isbn:${isbnToSearch}`);
          }
        }
      } catch (err) {
        console.warn(`[bookService] Google Books API request failed for q=isbn:${isbnToSearch}:`, err);
      }
    }

    // STEP 2: Fallback to Open Library API with primary and alternative ISBN
    for (const isbnToSearch of targetIsbns) {
      const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbnToSearch}&format=json&jscmd=data`;
      console.log(`[bookService] Requesting Open Library API: ${url}`);

      try {
        const olRes = await fetch(url);
        if (olRes.ok) {
          const olData = await olRes.json();
          const bookKey = `ISBN:${isbnToSearch}`;
          if (olData[bookKey]) {
            console.log('[bookService] Book found in Open Library:', olData[bookKey].title);
            return formatOpenLibraryBook(olData[bookKey], primaryIsbn);
          } else {
            console.log(`[bookService] Open Library returned no entry for ${bookKey}`);
          }
        }
      } catch (err) {
        console.warn(`[bookService] Open Library API request failed for ${isbnToSearch}:`, err);
      }
    }
  }

  // STEP 3: Fallback to general term / title / author search
  const searchTerms = [];
  if (options.title) searchTerms.push(`intitle:${options.title}`);
  if (options.author) searchTerms.push(`inauthor:${options.author}`);

  let fallbackQuery = searchTerms.join(' ');
  if (!fallbackQuery && queryText && !isNormalizedValid) {
    fallbackQuery = queryText;
  }

  if (fallbackQuery) {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(fallbackQuery)}`;
    console.log(`[bookService] Attempting general query fallback: ${url}`);

    try {
      const fallbackRes = await fetch(url);
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (fallbackData.items && fallbackData.items.length > 0) {
          const firstMatch = fallbackData.items[0];
          console.log('[bookService] Book found via fallback query:', firstMatch.volumeInfo?.title);
          return formatGoogleBook(firstMatch, primaryIsbn || 'MANUAL-ENTRY');
        }
      }
    } catch (err) {
      console.warn('[bookService] General query fallback failed:', err);
    }
  }

  console.warn('[bookService] Book search completed: No book found for given criteria.');
  return null;
}
