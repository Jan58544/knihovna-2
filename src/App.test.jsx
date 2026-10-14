// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import App from './App';
import * as bookService from './services/bookService';

vi.mock('./services/bookService');

describe('App Component', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('renders initial empty library state in Czech', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'BookGram' })).not.toBeNull();
    expect(screen.getByText(/0 knih/i)).not.toBeNull();
    expect(screen.getByText('Zatím žádné naskenované knihy')).not.toBeNull();
  });

  it('opens scanner modal on "Naskenovat knihu" button click', () => {
    render(<App />);
    const scanBtn = screen.getByRole('button', { name: /naskenovat knihu/i });
    fireEvent.click(scanBtn);

    expect(screen.getByText('Kamera')).not.toBeNull();
    expect(screen.getByText('Ruční zadání')).not.toBeNull();
  });

  it('allows manual entry with valid ISBN-13 and adds retrieved book to feed with Czech messages', async () => {
    const mockBook = {
      id: '9780306406157-1234',
      isbn: '9780306406157',
      title: 'Clean Architecture',
      authors: 'Robert C. Martin',
      publisher: 'Prentice Hall',
      publishedDate: '2017',
      description: "A Craftsman's Guide to Software Structure and Design",
      pageCount: 432,
      coverUrl: 'https://example.com/cover.jpg',
      scannedAt: new Date().toISOString(),
    };

    bookService.fetchBookByIsbn.mockResolvedValueOnce(mockBook);

    render(<App />);

    const scanBtn = screen.getByRole('button', { name: /naskenovat knihu/i });
    fireEvent.click(scanBtn);

    fireEvent.click(screen.getByText('Ruční zadání'));

    const input = screen.getByPlaceholderText(/např. 978-80-12345-67-8/i);
    fireEvent.change(input, { target: { value: '978-0-306-40615-7' } });

    const searchBtn = screen.getByRole('button', { name: /vyhledat knihu/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(bookService.fetchBookByIsbn).toHaveBeenCalledWith('9780306406157');
    });

    await waitFor(() => {
      expect(screen.getAllByText('Clean Architecture').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Robert C. Martin').length).toBeGreaterThan(0);
      expect(screen.getByText(/1 kniha/i)).not.toBeNull();
    });
  });

  it('allows manual entry with valid ISBN-10 and adds retrieved book to feed', async () => {
    const mockBook = {
      id: '0306406152-1234',
      isbn: '0306406152',
      title: 'Design Patterns',
      authors: 'Erich Gamma, Richard Helm',
      scannedAt: new Date().toISOString(),
    };

    bookService.fetchBookByIsbn.mockResolvedValueOnce(mockBook);

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /naskenovat knihu/i }));
    fireEvent.click(screen.getByText('Ruční zadání'));

    fireEvent.change(screen.getByPlaceholderText(/např. 978-80-12345-67-8/i), {
      target: { value: '0-306-40615-2' },
    });

    fireEvent.click(screen.getByRole('button', { name: /vyhledat knihu/i }));

    await waitFor(() => {
      expect(bookService.fetchBookByIsbn).toHaveBeenCalledWith('0306406152');
    });

    await waitFor(() => {
      expect(screen.getAllByText('Design Patterns').length).toBeGreaterThan(0);
    });
  });

  it('handles unfound book by displaying error and offering manual custom title/author entry', async () => {
    bookService.fetchBookByIsbn.mockResolvedValueOnce(null);

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /naskenovat knihu/i }));
    fireEvent.click(screen.getByText('Ruční zadání'));

    fireEvent.change(screen.getByPlaceholderText(/např. 978-80-12345-67-8/i), {
      target: { value: '9780306406157' },
    });

    fireEvent.click(screen.getByRole('button', { name: /vyhledat knihu/i }));

    await waitFor(() => {
      expect(screen.getByText(/nebyla nalezena/i)).not.toBeNull();
    });

    // Verify fallback button exists
    const manualFallbackBtn = screen.getByRole('button', { name: /Zadat název a autora ručně/i });
    expect(manualFallbackBtn).not.toBeNull();

    // Click fallback button to open ScannerModal with prefilled ISBN and custom fields
    fireEvent.click(manualFallbackBtn);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Název knihy/i)).not.toBeNull();
    });

    // Enter manual title and author
    fireEvent.change(screen.getByPlaceholderText(/Název knihy/i), {
      target: { value: 'Neznámá Kniha' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Jméno autora/i), {
      target: { value: 'Jan Novák' },
    });

    // Submit custom book form
    fireEvent.click(screen.getByRole('button', { name: /Přidat knihu do knihovny/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Neznámá Kniha').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Jan Novák').length).toBeGreaterThan(0);
    });
  });

  it('prevents adding duplicate books to the library with Czech warning', async () => {
    const mockBook = {
      id: '9780306406157-1234',
      isbn: '9780306406157',
      title: 'Clean Architecture',
      authors: 'Robert C. Martin',
      scannedAt: new Date().toISOString(),
    };

    bookService.fetchBookByIsbn.mockResolvedValue(mockBook);

    render(<App />);

    // First addition
    fireEvent.click(screen.getByRole('button', { name: /naskenovat knihu/i }));
    fireEvent.click(screen.getByText('Ruční zadání'));
    fireEvent.change(screen.getByPlaceholderText(/např. 978-80-12345-67-8/i), {
      target: { value: '9780306406157' },
    });
    fireEvent.click(screen.getByRole('button', { name: /vyhledat knihu/i }));

    await waitFor(() => {
      expect(screen.getByText(/1 kniha/i)).not.toBeNull();
      expect(screen.getAllByText('Clean Architecture').length).toBeGreaterThan(0);
    });

    // Attempt second addition of same book via ISBN-10 equivalent
    fireEvent.click(screen.getByRole('button', { name: /naskenovat knihu/i }));
    fireEvent.click(screen.getByText('Ruční zadání'));
    fireEvent.change(screen.getByPlaceholderText(/např. 978-80-12345-67-8/i), {
      target: { value: '0306406152' },
    });
    fireEvent.click(screen.getByRole('button', { name: /vyhledat knihu/i }));

    await waitFor(() => {
      expect(screen.getByText('Kniha "Clean Architecture" již je ve vaší knihovně!')).not.toBeNull();
      expect(screen.getByText(/1 kniha/i)).not.toBeNull();
    });
  });

  it('handles API errors gracefully', async () => {
    bookService.fetchBookByIsbn.mockRejectedValueOnce(new Error('Network error'));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /naskenovat knihu/i }));
    fireEvent.click(screen.getByText('Ruční zadání'));
    fireEvent.change(screen.getByPlaceholderText(/např. 978-80-12345-67-8/i), {
      target: { value: '9780306406157' },
    });
    fireEvent.click(screen.getByRole('button', { name: /vyhledat knihu/i }));

    await waitFor(() => {
      expect(screen.getByText(/Chyba při vyhledávání knihy/i)).not.toBeNull();
    });
  });
});
