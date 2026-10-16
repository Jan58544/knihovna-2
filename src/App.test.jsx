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
    vi.clearAllMocks();
    vi.resetAllMocks();
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
      id: '9788025703670-1234',
      isbn: '9788025703670',
      title: 'Životy slavných a starých provensálských básníků',
      authors: 'Jean de Nostredame',
      publisher: 'Argo',
      publishedDate: '2011',
      description: '218 s. : il. ; 22 cm',
      pageCount: 218,
      coverUrl: 'https://www.knihovny.cz/Cover/Show?id=mkp.3521868&size=large',
      scannedAt: new Date().toISOString(),
    };

    bookService.fetchBookByIsbn.mockResolvedValueOnce(mockBook);

    render(<App />);

    const scanBtn = screen.getByRole('button', { name: /naskenovat knihu/i });
    fireEvent.click(scanBtn);

    fireEvent.click(screen.getByText('Ruční zadání'));

    const input = screen.getByPlaceholderText(/např./i);
    fireEvent.change(input, { target: { value: '978-80-257-0367-0' } });

    const searchBtn = screen.getByRole('button', { name: /vyhledat knihu/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(bookService.fetchBookByIsbn).toHaveBeenCalledWith('9788025703670');
    });

    await waitFor(() => {
      expect(screen.getAllByText('Životy slavných a starých provensálských básníků').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Jean de Nostredame').length).toBeGreaterThan(0);
      expect(screen.getByText(/1 kniha/i)).not.toBeNull();
    });
  });

  it('allows manual entry with valid ISBN-10 and adds retrieved book to feed', async () => {
    const mockBook = {
      id: '0306406152-1234',
      isbn: '0306406152',
      title: 'Design Patterns',
      authors: 'Erich Gamma',
      scannedAt: new Date().toISOString(),
    };

    bookService.fetchBookByIsbn.mockResolvedValueOnce(mockBook);

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /naskenovat knihu/i }));
    fireEvent.click(screen.getByText('Ruční zadání'));

    fireEvent.change(screen.getByPlaceholderText(/např./i), {
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

    fireEvent.change(screen.getByPlaceholderText(/např./i), {
      target: { value: '9788025703670' },
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
      id: '9788025703670-1234',
      isbn: '9788025703670',
      title: 'Životy slavných a starých provensálských básníků',
      authors: 'Jean de Nostredame',
      scannedAt: new Date().toISOString(),
    };

    bookService.fetchBookByIsbn
      .mockResolvedValueOnce(mockBook)
      .mockResolvedValueOnce(mockBook);

    render(<App />);

    // First addition
    fireEvent.click(screen.getByRole('button', { name: /naskenovat knihu/i }));
    fireEvent.click(screen.getByText('Ruční zadání'));
    fireEvent.change(screen.getByPlaceholderText(/např./i), {
      target: { value: '9788025703670' },
    });
    fireEvent.click(screen.getByRole('button', { name: /vyhledat knihu/i }));

    await waitFor(() => {
      expect(screen.getByText(/1 kniha/i)).not.toBeNull();
      expect(screen.getAllByText('Životy slavných a starých provensálských básníků').length).toBeGreaterThan(0);
    });

    // Attempt second addition of same book
    fireEvent.click(screen.getByRole('button', { name: /naskenovat knihu/i }));
    fireEvent.click(screen.getByText('Ruční zadání'));
    fireEvent.change(screen.getByPlaceholderText(/např./i), {
      target: { value: '9788025703670' },
    });
    fireEvent.click(screen.getByRole('button', { name: /vyhledat knihu/i }));

    await waitFor(() => {
      expect(screen.getByText('Kniha "Životy slavných a starých provensálských básníků" již je ve vaší knihovně!')).not.toBeNull();
      expect(screen.getByText(/1 kniha/i)).not.toBeNull();
    });
  });

  it('handles API errors gracefully', async () => {
    bookService.fetchBookByIsbn.mockRejectedValueOnce(new Error('Network error'));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /naskenovat knihu/i }));
    fireEvent.click(screen.getByText('Ruční zadání'));
    fireEvent.change(screen.getByPlaceholderText(/např./i), {
      target: { value: '9788025703670' },
    });
    fireEvent.click(screen.getByRole('button', { name: /vyhledat knihu/i }));

    await waitFor(() => {
      expect(screen.getByText(/Chyba při vyhledávání knihy/i)).not.toBeNull();
    });
  });
});
