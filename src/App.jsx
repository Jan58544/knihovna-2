import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, BookOpen, Loader2, Library } from 'lucide-react';
import ScannerModal from './components/ScannerModal';
import BookCard from './components/BookCard';
import { fetchBookByIsbn } from './services/bookService';
import { cleanIsbn, isbn10To13, isbn13To10 } from './utils/isbnUtils';
import { groupBooksByGenre } from './utils/genres';

const LOCAL_STORAGE_KEY = 'scanned_books_feed_v1';

/**
 * Checks if a candidate book is already in the library list.
 */
function isDuplicateBook(newBook, existingBooks) {
  if (!newBook || !Array.isArray(existingBooks)) return false;

  const newClean = cleanIsbn(newBook.isbn);
  const newAlt = newClean.length === 10 ? isbn10To13(newClean) : (newClean.length === 13 ? isbn13To10(newClean) : null);
  const newIsbns = [newClean, newAlt].filter(Boolean);

  const newTitle = (newBook.title || '').trim().toLowerCase();
  const newAuthors = (newBook.authors || '').trim().toLowerCase();

  return existingBooks.some((existing) => {
    const existingClean = cleanIsbn(existing.isbn);
    const existingAlt = existingClean.length === 10 ? isbn10To13(existingClean) : (existingClean.length === 13 ? isbn13To10(existingClean) : null);
    const existingIsbns = [existingClean, existingAlt].filter(Boolean);

    // Check ISBN overlap
    if (newIsbns.length > 0 && existingIsbns.length > 0) {
      const hasIsbnMatch = newIsbns.some((isbn) => existingIsbns.includes(isbn));
      if (hasIsbnMatch) return true;
    }

    // Check Title & Author match
    const existingTitle = (existing.title || '').trim().toLowerCase();
    const existingAuthors = (existing.authors || '').trim().toLowerCase();
    if (newTitle && existingTitle && newTitle === existingTitle) {
      if (!newAuthors || !existingAuthors || newAuthors === existingAuthors) {
        return true;
      }
    }

    return false;
  });
}

export default function App() {
  const [books, setBooks] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load books from localStorage:', e);
      return [];
    }
  });

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState('camera');
  const [scannerInput, setScannerInput] = useState('');
  const [scannerShowCustom, setScannerShowCustom] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const booksRef = useRef(books);
  useEffect(() => {
    booksRef.current = books;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(books));
    } catch (e) {
      console.error('Failed to save books to localStorage:', e);
    }
  }, [books]);

  const handleCloseScanner = useCallback(() => {
    setIsScannerOpen(false);
  }, []);

  const openScannerModal = useCallback((mode = 'camera', input = '', showCustom = false) => {
    setScannerMode(mode);
    setScannerInput(input);
    setScannerShowCustom(showCustom);
    setIsScannerOpen(true);
  }, []);

  const handleUpdateBookGenre = useCallback((bookId, newGenre) => {
    setBooks((prevBooks) =>
      prevBooks.map((b) => (b.id === bookId ? { ...b, genre: newGenre } : b))
    );
  }, []);

  const handleScanSuccess = useCallback(async (scannedValue, manualFallbackData = null) => {
    const rawVal = (scannedValue || '').trim();
    if (!rawVal && !manualFallbackData) return;

    console.log('[scan] Processing scan result in App:', rawVal);
    setIsLoading(true);
    setStatusMessage({
      type: 'info',
      text: `Hledám knihu pro: ${rawVal || manualFallbackData?.title || ''}...`,
    });

    try {
      let bookData = null;
      if (manualFallbackData) {
        bookData = manualFallbackData;
      } else {
        bookData = await fetchBookByIsbn(rawVal);
      }

      if (bookData) {
        // Check if book already exists in library feed
        const currentBooks = booksRef.current;
        const duplicate = isDuplicateBook(bookData, currentBooks);

        if (duplicate) {
          console.log('[scan] Duplicate book detected:', bookData.title);
          setStatusMessage({
            type: 'error',
            text: `Kniha "${bookData.title}" již je ve vaší knihovně!`,
          });
        } else {
          console.log('[scan] Book added to library feed:', bookData.title);
          setBooks((prevBooks) => [bookData, ...prevBooks]);
          setStatusMessage({ type: 'success', text: `Kniha "${bookData.title}" byla přidána do knihovny!` });
        }
      } else {
        console.warn('[scan] Book not found for query:', rawVal);
        setStatusMessage({
          type: 'error',
          text: `Kniha "${rawVal}" nebyla nalezena. Zkuste skenovat znovu nebo zadejte údaje ručně.`,
          isNotFound: true,
          lastQuery: rawVal,
        });
      }
    } catch (err) {
      console.error('[scan] Error processing scanned input:', err);
      setStatusMessage({
        type: 'error',
        text: 'Chyba při vyhledávání knihy. Zkontrolujte prosím připojení k internetu.',
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setStatusMessage((current) => (current?.type === 'info' ? null : current));
      }, 5000);
    }
  }, []);

  const groupedBooks = groupBooksByGenre(books);

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center text-gray-900">
      {/* Mobile container simulating phone layout */}
      <div className="w-full max-w-md min-h-screen bg-white shadow-xl flex flex-col border-x border-gray-200">

        {/* Instagram Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Library className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold tracking-tight text-gray-900 font-sans italic">
              BookGram
            </h1>
          </div>
          <div className="text-xs text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded-full">
            {books.length} {books.length === 1 ? 'kniha' : books.length >= 2 && books.length <= 4 ? 'knihy' : 'knih'}
          </div>
        </header>

        {/* Scan Button Section (Fixed directly above feed) */}
        <div className="px-4 py-4 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
          <button
            type="button"
            onClick={() => openScannerModal('camera')}
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-md hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Hledám knihu...</span>
              </>
            ) : (
              <>
                <Camera className="w-5 h-5" />
                <span>Naskenovat knihu</span>
              </>
            )}
          </button>

          {/* Status banner */}
          {statusMessage && (
            <div
              className={`mt-3 px-3.5 py-2.5 rounded-lg text-xs font-medium text-center transition-all flex flex-col items-center gap-1.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}
            >
              <span>{statusMessage.text}</span>
              {statusMessage.isNotFound && (
                <button
                  type="button"
                  onClick={() => openScannerModal('manual', statusMessage.lastQuery, true)}
                  className="mt-1 px-3 py-1 bg-rose-600 text-white rounded-md text-xs font-semibold hover:bg-rose-500 transition-colors shadow-sm"
                >
                  Zadat název a autora ručně
                </button>
              )}
            </div>
          )}
        </div>

        {/* Book Feed grouped by genre */}
        <main className="flex-1 bg-gray-100 p-0 sm:p-2 overflow-y-auto">
          {groupedBooks.length > 0 ? (
            <div className="space-y-4">
              {groupedBooks.map(({ genre, books: genreBooks }) => (
                <section key={genre} className="bg-gray-100 rounded-lg">
                  <div className="sticky top-0 z-20 bg-gray-100/95 backdrop-blur-xs px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-800 tracking-wide uppercase flex items-center gap-1.5">
                      <span>{genre}</span>
                    </h2>
                    <span className="text-xs font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                      {genreBooks.length} {genreBooks.length === 1 ? 'kniha' : genreBooks.length >= 2 && genreBooks.length <= 4 ? 'knihy' : 'knih'}
                    </span>
                  </div>

                  <div className="space-y-0 sm:space-y-2 mt-2">
                    {genreBooks.map((book) => (
                      <BookCard key={book.id} book={book} onUpdateGenre={handleUpdateBookGenre} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 mb-4">
                <BookOpen className="w-8 h-8 stroke-1" />
              </div>
              <h3 className="text-base font-semibold text-gray-800">Zatím žádné naskenované knihy</h3>
              <p className="text-xs text-gray-500 max-w-xs mt-1">
                Klepnutím na tlačítko "Naskenovat knihu" výše naskenujte čárový kód ISBN a přidejte knihu do knihovny.
              </p>
            </div>
          )}
        </main>

        {/* Camera Scanner Modal */}
        <ScannerModal
          isOpen={isScannerOpen}
          onClose={handleCloseScanner}
          onScanSuccess={handleScanSuccess}
          initialMode={scannerMode}
          initialInput={scannerInput}
          initialShowCustomFields={scannerShowCustom}
        />
      </div>
    </div>
  );
}
