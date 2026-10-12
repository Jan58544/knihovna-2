/**
 * ISBN Utilities: Clean, Validate, Convert, and OCR Correct ISBN-10 and ISBN-13
 */

/**
 * Normalizes input by trimming, converting to uppercase, and removing hyphens/spaces.
 * Keeps digits and 'X'.
 * @param {string} raw
 * @returns {string}
 */
export function cleanIsbn(raw) {
  if (!raw || typeof raw !== 'string') return '';
  // Convert to upper case and remove everything except 0-9 and X
  const cleaned = raw.toUpperCase().replace(/[^0-9X]/g, '');
  return cleaned;
}

/**
 * Validates an ISBN-10 string (must be 10 characters: 9 digits + 1 digit or 'X').
 * @param {string} isbn10
 * @returns {boolean}
 */
export function isValidIsbn10(isbn10) {
  const cleaned = cleanIsbn(isbn10);
  if (!/^[0-9]{9}[0-9X]$/.test(cleaned)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i], 10) * (10 - i);
  }

  const lastChar = cleaned[9];
  const lastVal = lastChar === 'X' ? 10 : parseInt(lastChar, 10);
  sum += lastVal;

  return sum % 11 === 0;
}

/**
 * Validates an ISBN-13 string (must be 13 digits).
 * @param {string} isbn13
 * @returns {boolean}
 */
export function isValidIsbn13(isbn13) {
  const cleaned = cleanIsbn(isbn13);
  if (!/^[0-9]{13}$/.test(cleaned)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const digit = parseInt(cleaned[i], 10);
    sum += (i % 2 === 0) ? digit : digit * 3;
  }

  return sum % 10 === 0;
}

/**
 * Checks if input is valid ISBN-10 or ISBN-13.
 * @param {string} isbn
 * @returns {boolean}
 */
export function isValidIsbn(isbn) {
  return isValidIsbn10(isbn) || isValidIsbn13(isbn);
}

/**
 * Calculates check digit for 9-digit ISBN-10 prefix.
 * @param {string} first9Digits
 * @returns {string|null} Check digit ('0'-'9' or 'X')
 */
export function calculateIsbn10CheckDigit(first9Digits) {
  const cleaned = cleanIsbn(first9Digits);
  if (!/^[0-9]{9}$/.test(cleaned)) return null;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i], 10) * (10 - i);
  }

  const remainder = sum % 11;
  const checkVal = (11 - remainder) % 11;
  return checkVal === 10 ? 'X' : checkVal.toString();
}

/**
 * Calculates check digit for 12-digit ISBN-13 prefix.
 * @param {string} first12Digits
 * @returns {string|null} Check digit ('0'-'9')
 */
export function calculateIsbn13CheckDigit(first12Digits) {
  const cleaned = cleanIsbn(first12Digits);
  if (!/^[0-9]{12}$/.test(cleaned)) return null;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(cleaned[i], 10);
    sum += (i % 2 === 0) ? digit : digit * 3;
  }

  const remainder = sum % 10;
  const checkVal = (10 - remainder) % 10;
  return checkVal.toString();
}

/**
 * Converts a valid or clean ISBN-10 to ISBN-13.
 * @param {string} isbn10
 * @returns {string|null} ISBN-13 string or null if invalid input
 */
export function isbn10To13(isbn10) {
  const cleaned = cleanIsbn(isbn10);
  if (cleaned.length < 9) return null;

  const first9 = cleaned.substring(0, 9);
  if (!/^[0-9]{9}$/.test(first9)) return null;

  const prefix = '978' + first9;
  const checkDigit = calculateIsbn13CheckDigit(prefix);
  if (checkDigit === null) return null;

  return prefix + checkDigit;
}

/**
 * Converts a valid or clean ISBN-13 (starting with 978) to ISBN-10.
 * @param {string} isbn13
 * @returns {string|null} ISBN-10 string or null if not convertible or invalid
 */
export function isbn13To10(isbn13) {
  const cleaned = cleanIsbn(isbn13);
  if (!cleaned.startsWith('978') || cleaned.length < 12) return null;

  const middle9 = cleaned.substring(3, 12);
  if (!/^[0-9]{9}$/.test(middle9)) return null;

  const checkDigit = calculateIsbn10CheckDigit(middle9);
  if (checkDigit === null) return null;

  return middle9 + checkDigit;
}

/**
 * Attempts to fix common OCR misread characters in a raw ISBN string.
 * OCR substitution table:
 * O / o -> 0
 * I / i / L / l -> 1
 * S / s -> 5
 * B / b -> 8
 * G / g -> 6
 *
 * Re-validates candidate and returns corrected ISBN string or null if no valid ISBN can be derived.
 * @param {string} raw
 * @returns {string|null}
 */
export function attemptOcrCorrection(raw) {
  if (!raw || typeof raw !== 'string') return null;

  const cleaned = cleanIsbn(raw);
  if (isValidIsbn(cleaned)) {
    return cleaned;
  }

  // Common OCR character mappings
  const ocrMap = {
    'O': '0',
    'I': '1',
    'L': '1',
    'S': '5',
    'B': '8',
    'G': '6'
  };

  // Convert raw string with ocrMap replacements
  const upperRaw = raw.toUpperCase();
  let candidateArr = [];
  for (let i = 0; i < upperRaw.length; i++) {
    const ch = upperRaw[i];
    if (ocrMap[ch]) {
      candidateArr.push(ocrMap[ch]);
    } else {
      candidateArr.push(ch);
    }
  }

  const mapCorrectedClean = cleanIsbn(candidateArr.join(''));
  if (isValidIsbn(mapCorrectedClean)) {
    return mapCorrectedClean;
  }

  // If candidate is length 10 or 13, try single position substitutions if map replacement was partial
  const strToTry = upperRaw.replace(/[^0-9OILSBGX]/g, '');
  if (strToTry.length === 10 || strToTry.length === 13) {
    // Generate possibilities for characters that could be misread
    for (let i = 0; i < strToTry.length; i++) {
      const ch = strToTry[i];
      if (ocrMap[ch]) {
        const testStr = strToTry.substring(0, i) + ocrMap[ch] + strToTry.substring(i + 1);
        const testClean = cleanIsbn(testStr);
        if (isValidIsbn(testClean)) {
          return testClean;
        }
      }
    }
  }

  return null;
}
