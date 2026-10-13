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

  it('allows manual entry and adds retrieved book to feed with Czech messages', async () => {
    const mockBook = {
      id: '9780306406157-1234',
      isbn: '9780306406157',
      title: 'Clean Architecture',
      authors: 'Robert C. Martin',
      publisher: 'Prentice Hall',
      publishedDate: '2017',
      description: 'A Craftsman\'s Guide to Software Structure and Design',
      pageCount: 432,
      coverUrl: 'https://example.com/cover.jpg',
      scannedAt: new Date().toISOString(),
    };

    bookService.fetchBookByIsbn.mockResolvedValueOnce(mockBook);

    render(<App />);

    // Open scanner modal
    const scanBtn = screen.getByRole('button', { name: /naskenovat knihu/i });
    fireEvent.click(scanBtn);

    // Switch to manual entry tab
    fireEvent.click(screen.getByText('Ruční zadání'));

    // Type ISBN into manual input
    const input = screen.getByPlaceholderText(/např. 978-80-12345-67-8/i);
    fireEvent.change(input, { target: { value: '978-0-306-40615-7' } });

    // Submit form
    const searchBtn = screen.getByRole('button', { name: /vyhledat knihu/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(bookService.fetchBookByIsbn).toHaveBeenCalledWith('978-0-306-40615-7', { title: '978-0-306-40615-7' });
    });

    await waitFor(() => {
      expect(screen.getAllByText('Clean Architecture').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Robert C. Martin').length).toBeGreaterThan(0);
      expect(screen.getByText(/1 kniha/i)).not.toBeNull();
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
    const scanBtn = screen.getByRole('button', { name: /naskenovat knihu/i });
    fireEvent.click(scanBtn);
    fireEvent.click(screen.getByText('Ruční zadání'));
    fireEvent.change(screen.getByPlaceholderText(/např. 978-80-12345-67-8/i), {
      target: { value: '9780306406157' },
    });
    fireEvent.click(screen.getByRole('button', { name: /vyhledat knihu/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Clean Architecture').length).toBeGreaterThan(0);
      expect(screen.getByText(/1 kniha/i)).not.toBeNull();
    });

    // Attempt second addition of same book
    fireEvent.click(screen.getByRole('button', { name: /naskenovat knihu/i }));
    fireEvent.click(screen.getByText('Ruční zadání'));
    fireEvent.change(screen.getByPlaceholderText(/např. 978-80-12345-67-8/i), {
      target: { value: '0306406152' }, // Same book via ISBN-10 equivalent
    });
    fireEvent.click(screen.getByRole('button', { name: /vyhledat knihu/i }));

    await waitFor(() => {
      expect(screen.getByText('Kniha "Clean Architecture" již je ve vaší knihovně!')).not.toBeNull();
      expect(screen.getByText(/1 kniha/i)).not.toBeNull();
    });
  });
});
