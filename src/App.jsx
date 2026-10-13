import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, BookOpen, Loader2, Library } from 'lucide-react';
import ScannerModal from './components/ScannerModal';
import BookCard from './components/BookCard';
import { fetchBookByIsbn } from './services/bookService';
import { cleanIsbn } from './utils/isbnUtils';

const LOCAL_STORAGE_KEY = 'scanned_books_feed_v1';

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
        bookData = await fetchBookByIsbn(rawVal, { title: rawVal });
      }

      if (bookData) {
        // Check if book already exists in library feed by ISBN or Title
        const newCleanIsbn = cleanIsbn(bookData.isbn);
        const currentBooks = booksRef.current;
        const isDuplicate = currentBooks.some((existing) => {
          const existingCleanIsbn = cleanIsbn(existing.isbn);
          if (newCleanIsbn && existingCleanIsbn && newCleanIsbn === existingCleanIsbn) {
            return true;
          }
          if (
            existing.title &&
            bookData.title &&
            existing.title.trim().toLowerCase() === bookData.title.trim().toLowerCase() &&
            existing.authors &&
            bookData.authors &&
            existing.authors.trim().toLowerCase() === bookData.authors.trim().toLowerCase()
          ) {
            return true;
          }
          return false;
        });

        if (isDuplicate) {
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
        setStatusMessage(null);
      }, 5000);
    }
  }, []);

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
            onClick={() => setIsScannerOpen(true)}
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
              className={`mt-3 px-3.5 py-2.5 rounded-lg text-xs font-medium text-center transition-all ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}
            >
              {statusMessage.text}
            </div>
          )}
        </div>

        {/* Book Feed directly below "Scan a book" button */}
        <main className="flex-1 bg-gray-100 p-0 sm:p-2 overflow-y-auto">
          {books.length > 0 ? (
            <div className="space-y-0 sm:space-y-2">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
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
        />
      </div>
    </div>
  );
}
