import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, RefreshCw, Keyboard, Search, AlertCircle } from 'lucide-react';
import { cleanIsbn, isValidIsbn, attemptOcrCorrection } from '../utils/isbnUtils';
import { createIsbnScanVerifier } from '../utils/scanVerifier';
import { GENRES_LIST, detectGenre } from '../utils/genres';

export default function ScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  initialMode = 'camera',
  initialInput = '',
  initialShowCustomFields = false,
}) {
  const [mode, setMode] = useState(initialMode); // 'camera' or 'manual'
  const [manualInput, setManualInput] = useState(initialInput);
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [manualGenre, setManualGenre] = useState('');
  const [showCustomFields, setShowCustomFields] = useState(initialShowCustomFields);
  const [cameraError, setCameraError] = useState(null);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [manualError, setManualError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [scanStatusInfo, setScanStatusInfo] = useState(null);

  const scannerRef = useRef(null);
  const isStoppingRef = useRef(false);
  const scannedLockRef = useRef(false);
  const prevIsOpenRef = useRef(isOpen);

  // Helper to safely stop and clear scanner instance
  const safeStopScanner = useCallback(async () => {
    const instance = scannerRef.current;
    if (!instance || isStoppingRef.current) return;

    isStoppingRef.current = true;
    scannerRef.current = null;

    try {
      if (instance.isScanning) {
        console.log('[scan] Safely stopping active camera scanner...');
        await instance.stop();
      }
    } catch (err) {
      console.warn('[scan] Non-fatal camera scanner stop warning:', err);
    } finally {
      try {
        instance.clear();
      } catch {
        /* ignore clear error */
      }
      isStoppingRef.current = false;
    }
  }, []);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setMode(initialMode || 'camera');
      setManualInput(initialInput || '');
      setShowCustomFields(initialShowCustomFields || false);
      setCameraError(null);
      setManualError(null);
      setManualTitle('');
      setManualAuthor('');
      setManualGenre('');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialMode, initialInput, initialShowCustomFields]);

  const handleClose = useCallback(() => {
    safeStopScanner();
    setManualInput('');
    setManualTitle('');
    setManualAuthor('');
    setManualGenre('');
    setShowCustomFields(false);
    setCameraError(null);
    setManualError(null);
    setMode('camera');
    onClose();
  }, [onClose, safeStopScanner]);

  // Camera initialization and cleanup
  useEffect(() => {
    if (!isOpen || mode !== 'camera') {
      safeStopScanner();
      return;
    }

    scannedLockRef.current = false;
    let isCancelled = false;

    const startScanner = async () => {
      try {
        setIsInitializing(true);
        setCameraError(null);
        setScanStatusInfo('Snímání...');

        console.log('[scan] Initializing camera scanner...');
        const element = document.getElementById('reader');
        if (!element) {
          console.warn('[scan] Scanner DOM element #reader not found');
          if (!isCancelled) setIsInitializing(false);
          return;
        }

        // Stop any previous instance first
        await safeStopScanner();
        if (isCancelled) return;

        const html5Qrcode = new Html5Qrcode('reader', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.CODE_128,
          ],
          useBarCodeDetectorIfSupported: true,
          verbose: false,
        });
        scannerRef.current = html5Qrcode;
        const verifyScan = createIsbnScanVerifier();

        const config = {
          fps: 24,
          disableFlip: true,
          videoConstraints: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          qrbox: (width, height) => ({
            width: Math.min(420, Math.floor(width * 0.9)),
            height: Math.min(180, Math.floor(height * 0.65)),
          }),
        };

        await html5Qrcode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (isCancelled || scannedLockRef.current) return;

            // Barcode reads are never OCR-corrected or stripped of unexpected characters.
            // Two matching reads guard against a single plausible but incorrect decode.
            const validIsbn = verifyScan(decodedText);
            if (!validIsbn) return;

            scannedLockRef.current = true;

            setScanStatusInfo(`ISBN: ${validIsbn}`);

            safeStopScanner();
            onScanSuccess(validIsbn);
            handleClose();
          },
          () => {}
        );

        if (!isCancelled) {
          console.log('[scan] Camera scanner started successfully');
          setIsInitializing(false);
        } else {
          safeStopScanner();
        }
      } catch (err) {
        console.error('[scan] Camera initialization error:', err);
        if (!isCancelled) {
          const errorName = err?.name || String(err);
          if (/NotAllowedError|PermissionDeniedError/.test(errorName)) {
            setCameraError('Přístup ke kameře je zakázaný. V nastavení tohoto webu v prohlížeči povolte kameru a zkuste to znovu.');
          } else if (/NotFoundError|DevicesNotFoundError/.test(errorName)) {
            setCameraError('Nebyla nalezena kamera. Zkontrolujte její dostupnost nebo zadejte ISBN ručně.');
          } else {
            setCameraError('Kameru se nepodařilo spustit. Zavřete jiné aplikace používající kameru a zkuste to znovu.');
          }
          setIsInitializing(false);
        }
      }
    };

    const timer = setTimeout(() => {
      startScanner();
    }, 0);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      safeStopScanner();
    };
  }, [isOpen, mode, onScanSuccess, handleClose, safeStopScanner, cameraAttempt]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    setManualError(null);
    const trimmed = manualInput.trim();

    if (showCustomFields || manualTitle.trim()) {
      if (!manualTitle.trim()) {
        setManualError('Zadejte prosím název knihy.');
        return;
      }
      const customBook = {
        id: `${cleanIsbn(trimmed) || 'MANUAL'}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        isbn: cleanIsbn(trimmed) || trimmed || '',
        title: manualTitle.trim(),
        authors: manualAuthor.trim() || 'Neznámý autor',
        genre: manualGenre || detectGenre({ title: manualTitle.trim(), authors: manualAuthor.trim() }),
        publisher: null,
        publishedDate: null,
        description: null,
        pageCount: null,
        coverUrl: null,
        scannedAt: new Date().toISOString(),
      };
      console.log('[scan] Adding manual book entry directly:', customBook);
      safeStopScanner();
      onScanSuccess(trimmed, customBook);
      handleClose();
      return;
    }

    if (!trimmed) {
      setManualError('Zadejte prosím ISBN nebo název knihy.');
      return;
    }

    const cleaned = cleanIsbn(trimmed);
    const isPureCode = /^[0-9X\- ]+$/i.test(trimmed);

    let valueToSend = trimmed;
    if (isPureCode) {
      if (isValidIsbn(cleaned)) {
        valueToSend = cleaned;
      } else {
        const corrected = attemptOcrCorrection(trimmed);
        if (corrected && isValidIsbn(corrected)) {
          valueToSend = corrected;
        } else {
          setManualError('Neplatné ISBN. Zkontrolujte kód nebo zvolte ruční zadání názvu níže.');
          setShowCustomFields(true);
          return;
        }
      }
    }

    safeStopScanner();
    onScanSuccess(valueToSend);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-black rounded-2xl overflow-hidden shadow-2xl border border-neutral-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-900 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setManualError(null);
                setMode('camera');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                mode === 'camera'
                  ? 'bg-indigo-600 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Kamera</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCameraError(null);
                setManualError(null);
                setMode('manual');
                safeStopScanner();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                mode === 'manual'
                  ? 'bg-indigo-600 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Keyboard className="w-4 h-4" />
              <span>Ruční zadání</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            aria-label="Zavřít skener"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="relative bg-black flex flex-col items-center justify-center">
          {/* Always render #reader in DOM so html5Qrcode can safely stop/clear without missing container */}
          <div
            id="reader"
            className={`w-full overflow-hidden ${mode === 'camera' ? 'block min-h-[250px]' : 'hidden'}`}
          ></div>

          {mode === 'camera' && (
            <>
              {isInitializing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 gap-2 z-10 bg-black">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                  <p className="text-sm font-medium">Spouštění kamery...</p>
                </div>
              )}

              {cameraError ? (
                <div className="p-6 text-center text-red-400 text-sm">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
                  <p className="font-semibold mb-2">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => setCameraAttempt((attempt) => attempt + 1)}
                    className="mt-3 mr-2 px-4 py-2 bg-neutral-800 text-white rounded-lg text-xs"
                  >
                    Zkusit kameru znovu
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('manual');
                      safeStopScanner();
                    }}
                    className="mt-3 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg text-xs hover:bg-indigo-500 transition-colors"
                  >
                    Zadejte ISBN ručně
                  </button>
                </div>
              ) : (
                scanStatusInfo && (
                  <div className="absolute bottom-2 left-2 right-2 bg-black/75 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-mono text-center border border-emerald-500/30">
                    {scanStatusInfo}
                  </div>
                )
              )}
            </>
          )}

          {mode === 'manual' && (
            <form onSubmit={handleManualSubmit} className="w-full p-6 bg-neutral-950 flex flex-col gap-4">
              <div>
                <label htmlFor="isbnInput" className="block text-xs font-medium text-neutral-300 mb-1.5">
                  ISBN nebo název / autor knihy
                </label>
                <input
                  id="isbnInput"
                  type="text"
                  placeholder="např. 9788025703670 nebo Saturnin"
                  value={manualInput}
                  onChange={(e) => {
                    setManualInput(e.target.value);
                    if (manualError) setManualError(null);
                  }}
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-neutral-500"
                />
                {manualError && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{manualError}</span>
                  </p>
                )}
              </div>

              {showCustomFields ? (
                <div className="space-y-3 pt-2 border-t border-neutral-800">
                  <div>
                    <label htmlFor="manualTitleInput" className="block text-xs font-medium text-neutral-300 mb-1">
                      Název knihy *
                    </label>
                    <input
                      id="manualTitleInput"
                      type="text"
                      placeholder="Název knihy"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="manualAuthorInput" className="block text-xs font-medium text-neutral-300 mb-1">
                      Autor
                    </label>
                    <input
                      id="manualAuthorInput"
                      type="text"
                      placeholder="Jméno autora"
                      value={manualAuthor}
                      onChange={(e) => setManualAuthor(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="manualGenreSelect" className="block text-xs font-medium text-neutral-300 mb-1">
                      Žánr (volitelné)
                    </label>
                    <select
                      id="manualGenreSelect"
                      value={manualGenre}
                      onChange={(e) => setManualGenre(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Automatické rozpoznání --</option>
                      {GENRES_LIST.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCustomFields(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 text-left underline"
                >
                  + Nebo přidejte název a autora ručně bez vyhledávání
                </button>
              )}

              <button
                type="submit"
                disabled={!manualInput.trim() && !manualTitle.trim()}
                className="w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                <span>{showCustomFields || manualTitle.trim() ? 'Přidat knihu do knihovny' : 'Vyhledat knihu'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-3 bg-neutral-900 border-t border-neutral-800 text-center text-xs text-neutral-400">
          {mode === 'camera'
            ? 'Naměřte čárový kód ISBN knihy do vyznačeného okna'
            : 'Zadejte ISBN nebo název pro vyhledání knihy'}
        </div>
      </div>
    </div>
  );
}
