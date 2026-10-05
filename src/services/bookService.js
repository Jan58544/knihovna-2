/**
 * Fetches book details by ISBN from Google Books API with Open Library API fallback.
 * @param {string} rawIsbn
 * @returns {Promise<Object|null>} Book object or null if not found.
 */
export async function fetchBookByIsbn(rawIsbn) {
  if (!rawIsbn) return null;
  const isbn = rawIsbn.replace(/[^0-9X]/gi, '');
  if (!isbn) return null;

  try {
    // 1. Try Google Books API
    const googleRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    if (googleRes.ok) {
      const googleData = await googleRes.json();
      if (googleData.items && googleData.items.length > 0) {
        const info = googleData.items[0].volumeInfo;
        let coverUrl = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null;
        if (coverUrl) {
          coverUrl = coverUrl.replace(/^http:/, 'https:');
        }

        return {
          id: `${isbn}-${Date.now()}`,
          isbn: isbn,
          title: info.title || 'Untitled',
          authors: info.authors ? info.authors.join(', ') : 'Unknown Author',
          publisher: info.publisher || null,
          publishedDate: info.publishedDate || null,
          description: info.description || null,
          pageCount: info.pageCount || null,
          coverUrl: coverUrl,
          scannedAt: new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn('Google Books API request failed, trying fallback:', err);
  }

  try {
    // 2. Fallback to Open Library API
    const olRes = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
    if (olRes.ok) {
      const olData = await olRes.json();
      const bookKey = `ISBN:${isbn}`;
      if (olData[bookKey]) {
        const info = olData[bookKey];
        const authors = info.authors ? info.authors.map(a => a.name).join(', ') : 'Unknown Author';
        const coverUrl = info.cover?.large || info.cover?.medium || info.cover?.small || null;

        return {
          id: `${isbn}-${Date.now()}`,
          isbn: isbn,
          title: info.title || 'Untitled',
          authors: authors,
          publisher: info.publishers ? info.publishers.map(p => p.name).join(', ') : null,
          publishedDate: info.publish_date || null,
          description: typeof info.notes === 'string' ? info.notes : null,
          pageCount: info.number_of_pages || null,
          coverUrl: coverUrl,
          scannedAt: new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn('Open Library API request failed:', err);
  }

  // Not found in either API
  return null;
}
