import { isValidIsbn } from './isbnUtils';

// Never invent digits: accept only an exact ISBN and a fresh matching second read.
export function createIsbnScanVerifier() {
  let previous = null;
  let previousTime = 0;
  return (raw, now = performance.now()) => {
    const valid = typeof raw === 'string'
      && (/^97[89]\d{10}$/.test(raw) || /^\d{9}[\dX]$/.test(raw))
      && isValidIsbn(raw);
    if (!valid) {
      previous = null;
      return null;
    }
    const confirmed = raw === previous && now > previousTime && now - previousTime <= 500;
    previous = raw;
    previousTime = now;
    return confirmed ? raw : null;
  };
}
