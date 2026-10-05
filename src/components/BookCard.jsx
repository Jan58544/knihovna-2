import React from 'react';
import { BookOpen, Calendar, Hash, Bookmark } from 'lucide-react';

export default function BookCard({ book }) {
  const formattedDate = book.scannedAt
    ? new Date(book.scannedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className="bg-white border border-gray-200 rounded-none sm:rounded-xl overflow-hidden shadow-xs mb-4">
      {/* Instagram Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[2px] shrink-0">
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {book.title}
            </p>
            <p className="text-xs text-gray-500 truncate">{book.authors}</p>
          </div>
        </div>
      </div>

      {/* Book Cover Container */}
      <div className="relative aspect-square w-full bg-gray-900 flex items-center justify-center overflow-hidden">
        {book.coverUrl ? (
          <>
            {/* Blurred background backdrop for non-square covers */}
            <img
              src={book.coverUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-lg opacity-40 scale-110"
              aria-hidden="true"
            />
            {/* Main Cover Image */}
            <img
              src={book.coverUrl}
              alt={book.title}
              className="relative z-10 max-h-full max-w-full object-contain shadow-2xl p-2 drop-shadow-md"
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-gray-400">
            <BookOpen className="w-16 h-16 stroke-1 mb-2 text-gray-500" />
            <p className="text-sm font-medium text-gray-300">{book.title}</p>
            <p className="text-xs text-gray-500 mt-1">{book.authors}</p>
          </div>
        )}
      </div>

      {/* Action Bar / Meta icons */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-4 text-gray-700">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            <Hash className="w-3.5 h-3.5 text-gray-400" />
            ISBN {book.isbn}
          </span>
        </div>
        <Bookmark className="w-5 h-5 text-gray-400" />
      </div>

      {/* Caption / Metadata */}
      <div className="px-4 pb-4 pt-2 text-sm">
        <p className="text-gray-900">
          <span className="font-semibold mr-2">{book.title}</span>
          <span className="text-gray-600">by {book.authors}</span>
        </p>

        {book.publisher && (
          <p className="text-xs text-gray-500 mt-1">
            Publisher: <span className="text-gray-700">{book.publisher}</span>
            {book.publishedDate && ` (${book.publishedDate})`}
          </p>
        )}

        {formattedDate && (
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-2 font-medium flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Scanned on {formattedDate}
          </p>
        )}
      </div>
    </div>
  );
}
