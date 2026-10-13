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

  it('renders initial empty library state', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'BookGram' })).not.toBeNull();
    expect(screen.getByText('0 books')).not.toBeNull();
    expect(screen.getByText('No books scanned yet')).not.toBeNull();
  });

  it('opens scanner modal on "Scan a book" button click', () => {
    render(<App />);
    const scanBtn = screen.getByRole('button', { name: /scan a book/i });
    fireEvent.click(scanBtn);

    expect(screen.getByText('Camera')).not.toBeNull();
    expect(screen.getByText('Manual Entry')).not.toBeNull();
  });

  it('allows manual entry and adds retrieved book to feed', async () => {
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
    const scanBtn = screen.getByRole('button', { name: /scan a book/i });
    fireEvent.click(scanBtn);

    // Switch to manual entry tab
    fireEvent.click(screen.getByText('Manual Entry'));

    // Type ISBN into manual input
    const input = screen.getByPlaceholderText(/e.g. 978-80-12345-67-8/i);
    fireEvent.change(input, { target: { value: '978-0-306-40615-7' } });

    // Submit form
    const searchBtn = screen.getByRole('button', { name: /search book/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(bookService.fetchBookByIsbn).toHaveBeenCalledWith('978-0-306-40615-7', { title: '978-0-306-40615-7' });
    });

    await waitFor(() => {
      expect(screen.getAllByText('Clean Architecture').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Robert C. Martin').length).toBeGreaterThan(0);
      expect(screen.getByText('1 book')).not.toBeNull();
    });
  });

  it('prevents adding duplicate books to the library', async () => {
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
    const scanBtn = screen.getByRole('button', { name: /scan a book/i });
    fireEvent.click(scanBtn);
    fireEvent.click(screen.getByText('Manual Entry'));
    fireEvent.change(screen.getByPlaceholderText(/e.g. 978-80-12345-67-8/i), {
      target: { value: '9780306406157' },
    });
    fireEvent.click(screen.getByRole('button', { name: /search book/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Clean Architecture').length).toBeGreaterThan(0);
      expect(screen.getByText('1 book')).not.toBeNull();
    });

    // Attempt second addition of same book
    fireEvent.click(screen.getByRole('button', { name: /scan a book/i }));
    fireEvent.click(screen.getByText('Manual Entry'));
    fireEvent.change(screen.getByPlaceholderText(/e.g. 978-80-12345-67-8/i), {
      target: { value: '0306406152' }, // Same book via ISBN-10 equivalent
    });
    fireEvent.click(screen.getByRole('button', { name: /search book/i }));

    await waitFor(() => {
      expect(screen.getByText('"Clean Architecture" is already in your library!')).not.toBeNull();
      expect(screen.getByText('1 book')).not.toBeNull();
    });
  });
});
