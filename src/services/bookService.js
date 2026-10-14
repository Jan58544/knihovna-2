import {
  cleanIsbn,
  isValidIsbn,
  attemptOcrCorrection,
  isbn10To13,
  isbn13To10,
} from '../utils/isbnUtils';

/**
 * Helper to check if a Google Books volume matches expected ISBNs.
 * - Collects all target ISBNs and their converted equivalents (ISBN-10 <-> ISBN-13).
 * - Collects all valid or 10/13 digit ISBN identifiers from the volume's industryIdentifiers.
 * - If volume has NO 10/13 digit ISBN identifiers listed (missing/empty or only non-ISBN identifiers), it is considered safe (matches).
 * - If volume HAS ISBN identifiers listed, at least one must match the target set. Otherwise it's rejected as a demonstrably different ISBN.
 *
 * @param {Object} volumeInfo
 * @param {Array<string>} targetIsbns
 * @returns {boolean}
 */
function isVolumeMatchingIsbn(volumeInfo, targetIsbns) {
  if (!volumeInfo) return false;

  // Build target set including conversions
  const targetSet = new Set();
  for (const raw of targetIsbns) {
    const cleaned = cleanIsbn(raw);
    if (!cleaned) continue;
    targetSet.add(cleaned);
    if (cleaned.length === 10) {
      const alt = isbn10To13(cleaned);
      if (alt) targetSet.add(alt);
    } else if (cleaned.length === 13) {
      const alt = isbn13To10(cleaned);
      if (alt) targetSet.add(alt);
    }
  }

  const identifiers = volumeInfo.industryIdentifiers || [];
  const volumeIsbns = new Set();

  for (const item of identifiers) {
    const cleanedId = cleanIsbn(item.identifier);
    if (cleanedId.length === 10 || cleanedId.length === 13) {
      volumeIsbns.add(cleanedId);
      if (cleanedId.length === 10) {
        const alt = isbn10To13(cleanedId);
        if (alt) volumeIsbns.add(alt);
      } else if (cleanedId.length === 13) {
        const alt = isbn13To10(cleanedId);
        if (alt) volumeIsbns.add(alt);
      }
    }
  }

  // If no ISBN identifiers present on volumeInfo, accept if returned by exact query
  if (volumeIsbns.size === 0) {
    return true;
  }

  // Check if at least one ISBN on the volume matches our target set
  for (const volIsbn of volumeIsbns) {
    if (targetSet.has(volIsbn)) {
      return true;
    }
  }

  // Has ISBN identifiers but none matched target -> demonstrably different ISBN
  return false;
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
    if (found && isValidIsbn(found)) {
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

  let description = null;
  if (typeof info.notes === 'string') {
    description = info.notes;
  } else if (info.notes && typeof info.notes.value === 'string') {
    description = info.notes.value;
  } else if (typeof info.description === 'string') {
    description = info.description;
  } else if (info.description && typeof info.description.value === 'string') {
    description = info.description.value;
  }

  return {
    id: `${cleanedFallback || 'BOOK'}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    isbn: cleanedFallback || fallbackIsbn || '',
    title: info.title || 'Untitled Book',
    authors: authors,
    publisher: info.publishers ? info.publishers.map(p => p.name).join(', ') : null,
    publishedDate: info.publish_date || null,
    description: description,
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
  console.log('[scan] [bookService] Raw input received:', queryText);

  if (!queryText && !options.title && !options.author) {
    return null;
  }

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

  // Determine alternative ISBN format (ISBN-10 <-> ISBN-13)
  let alternativeIsbn = null;
  if (isNormalizedValid) {
    if (primaryIsbn.length === 10) {
      alternativeIsbn = isbn10To13(primaryIsbn);
    } else if (primaryIsbn.length === 13) {
      alternativeIsbn = isbn13To10(primaryIsbn);
    }
    console.log(`[scan] [bookService] Normalized ISBN: ${primaryIsbn} (Valid). Alternative: ${alternativeIsbn || 'N/A'}`);
  }

  const targetIsbns = [primaryIsbn, alternativeIsbn].filter(Boolean);

  // STEP 1: Query Google Books API with exact primary ISBN and alternative ISBN
  if (targetIsbns.length > 0) {
    for (const isbnToSearch of targetIsbns) {
      const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbnToSearch}`;
      console.log(`[scan] [bookService] Requesting API URL: ${url}`);

      try {
        const googleRes = await fetch(url);
        console.log(`[scan] [bookService] API response status: ${googleRes ? googleRes.status : 'N/A'} for URL: ${url}`);
        if (googleRes && googleRes.ok) {
          let googleData = null;
          try {
            googleData = await googleRes.json();
          } catch (jsonErr) {
            console.error(`[scan] [bookService] Invalid JSON received from ${url}`, jsonErr);
          }

          if (googleData && Array.isArray(googleData.items) && googleData.items.length > 0) {
            console.log(`[scan] [bookService] Google Books returned ${googleData.items.length} item(s). Verifying ISBN match...`);

            // Verify items against target ISBNs
            for (const item of googleData.items) {
              if (isVolumeMatchingIsbn(item.volumeInfo, targetIsbns)) {
                console.log('[scan] [bookService] Verified book found in Google Books:', item.volumeInfo.title);
                return formatGoogleBook(item, primaryIsbn);
              }
            }
            console.log('[scan] [bookService] Google Books items did not match industryIdentifiers for ISBNs:', targetIsbns);
          } else {
            console.log(`[scan] [bookService] Google Books returned 0 items for q=isbn:${isbnToSearch}`);
          }
        }
      } catch (err) {
        console.error(`[scan] [bookService] Error requesting URL: ${url}`, err);
      }
    }

    // STEP 2: Fallback to Open Library API with primary and alternative ISBN
    for (const isbnToSearch of targetIsbns) {
      const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbnToSearch}&format=json&jscmd=data`;
      console.log(`[scan] [bookService] Requesting API URL: ${url}`);

      try {
        const olRes = await fetch(url);
        console.log(`[scan] [bookService] API response status: ${olRes ? olRes.status : 'N/A'} for URL: ${url}`);
        if (olRes && olRes.ok) {
          let olData = null;
          try {
            olData = await olRes.json();
          } catch (jsonErr) {
            console.error(`[scan] [bookService] Invalid JSON received from Open Library: ${url}`, jsonErr);
          }

          if (olData && typeof olData === 'object') {
            const bookKey = `ISBN:${isbnToSearch}`;
            if (olData[bookKey]) {
              console.log('[scan] [bookService] Book found in Open Library:', olData[bookKey].title);
              return formatOpenLibraryBook(olData[bookKey], primaryIsbn);
            } else {
              console.log(`[scan] [bookService] Open Library returned no entry for ${bookKey}`);
            }
          }
        }
      } catch (err) {
        console.error(`[scan] [bookService] Error requesting URL: ${url}`, err);
      }
    }
  }

  // STEP 3: Fallback to general term / title / author search
  const searchTerms = [];
  if (options.title && options.title !== rawIsbn) searchTerms.push(`intitle:${options.title}`);
  if (options.author) searchTerms.push(`inauthor:${options.author}`);

  let fallbackQuery = searchTerms.join(' ');
  if (!fallbackQuery && queryText && !isNormalizedValid) {
    fallbackQuery = queryText;
  }

  if (fallbackQuery) {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(fallbackQuery)}`;
    console.log(`[scan] [bookService] Requesting API URL (fallback query): ${url}`);

    try {
      const fallbackRes = await fetch(url);
      console.log(`[scan] [bookService] API response status: ${fallbackRes ? fallbackRes.status : 'N/A'} for URL: ${url}`);
      if (fallbackRes && fallbackRes.ok) {
        let fallbackData = null;
        try {
          fallbackData = await fallbackRes.json();
        } catch {
          /* ignore JSON error */
        }
        if (fallbackData && Array.isArray(fallbackData.items) && fallbackData.items.length > 0) {
          const firstMatch = fallbackData.items[0];
          console.log('[scan] [bookService] Book found via fallback query:', firstMatch.volumeInfo?.title);
          return formatGoogleBook(firstMatch, primaryIsbn || 'MANUAL-ENTRY');
        }
      }
    } catch (err) {
      console.error(`[scan] [bookService] Error requesting URL: ${url}`, err);
    }
  }

  console.warn('[scan] [bookService] Book search completed: No book found for given criteria.');
  return null;
}
